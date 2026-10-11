/**
 * Café Circle AI — migration runner.
 *
 * No `psql` on this machine, so migrations run through Node with `pg`.
 * Usage: `npx tsx scripts/migrate.ts` (from the project root).
 *
 * Applies every *.sql in supabase/migrations/ that has not been recorded in
 * public.app_migrations. Each file runs in its own transaction; the schema file
 * is written to be idempotent, so a partially-applied history is safe to re-run.
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { closePool, query, withTransaction } from "@/lib/server/db";

/**
 * Minimal .env reader — this project has no `dotenv` dependency. Reads
 * `.env` from the working directory and copies each
 * `KEY=VALUE` line into process.env. Values already present win, so a real
 * environment variable is never overwritten. Blank lines and `#` comments are
 * ignored; one matching pair of surrounding quotes is stripped.
 */
function loadEnvFiles(): void {
  for (const file of [".env"]) {
    let text: string;
    try {
      text = readFileSync(resolve(process.cwd(), file), "utf8");
    } catch {
      continue; // report the missing DATABASE_URL below
    }
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      if (!key || process.env[key] !== undefined) continue;
      let value = line.slice(eq + 1).trim();
      if (value.length > 1 && (value[0] === '"' || value[0] === "'") && value.endsWith(value[0])) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase", "migrations");

async function main(): Promise<void> {
  loadEnvFiles();

  if (!process.env.DATABASE_URL) {
    // API keys cannot execute DDL. Verify SQL Editor migrations rather than
    // pretending a publishable/secret key can be used as a Postgres password.
    const { getSupabase } = await import("@/lib/server/supabase");
    const { data, error } = await getSupabase().rpc("app_api_status");
    if (error || data !== "supabase-api-v1") {
      console.error("Apply the SQL files in supabase/migrations in order using Supabase SQL Editor.");
      console.error("If the initial schema is already applied, run only 20261011065347_supabase_api.sql.");
      console.error("API keys cannot run SQL migrations. This command only verifies them when DATABASE_URL is absent.");
      process.exitCode = 1;
    } else {
      console.log("Supabase API migration verified (already applied in SQL Editor). No SQL was executed by this command.");
    }
    return;
  }

  let currentFile = "";
  try {
    await query(
      `create table if not exists public.app_migrations (
         name       text primary key,
         applied_at timestamptz not null default now()
       )`,
    );

    const applied = new Set(
      (await query<{ name: string }>("select name from public.app_migrations")).map(
        (row) => row.name,
      ),
    );

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((name) => name.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log(`No .sql files found in ${MIGRATIONS_DIR}.`);
    }

    let appliedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      currentFile = file;
      if (applied.has(file)) {
        skippedCount += 1;
        console.log(`skipped  ${file}`);
        continue;
      }

      const sql = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");
      await withTransaction(async (client) => {
        await client.query(sql);
        await client.query("insert into public.app_migrations (name) values ($1)", [file]);
      });
      appliedCount += 1;
      console.log(`applied  ${file}`);
    }

    console.log(`\nMigration summary: ${appliedCount} applied, ${skippedCount} skipped.`);
  } catch (error) {
    console.error(`\nMigration failed while processing ${currentFile || "(setup)"}.`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    // Always release the pool so the Node process can exit.
    await closePool();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
