/**
 * Café Circle AI — demo-data seed runner.
 *
 * Usage: `npx tsx scripts/seed.ts` (from the project root).
 *
 * Seeds once, prints the row counts, then seeds a SECOND time and prints the
 * counts again to prove the seed is idempotent (no duplicates). Requires the
 * schema to exist already — run `scripts/migrate.ts` first.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { getSupabase } from "@/lib/server/supabase";
import { countRows, seedDemoData, type SeedCounts } from "@/lib/server/seed";

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
      continue; // configuration is checked by getSupabase()
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

function printCounts(counts: SeedCounts): void {
  const width = Math.max(...Object.keys(counts).map((label) => label.length));
  for (const [label, value] of Object.entries(counts)) {
    console.log(`  ${label.padEnd(width)}  ${value}`);
  }
}

async function main(): Promise<void> {
  loadEnvFiles();

  try {
    getSupabase();

    console.log("Seeding demo data (pass 1)…");
    await seedDemoData();
    console.log("Row counts after pass 1:");
    const firstCounts = await countRows();
    printCounts(firstCounts);

    console.log("\nSeeding demo data (pass 2 — idempotency check)…");
    await seedDemoData();
    console.log("Row counts after pass 2 (must be identical):");
    const secondCounts = await countRows();
    printCounts(secondCounts);
    if (JSON.stringify(firstCounts) !== JSON.stringify(secondCounts)) {
      throw new Error("Seed idempotency check failed: row counts changed on pass 2.");
    }

    console.log("\nSeed complete.");
  } catch (error) {
    console.error(`\nSeed failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
