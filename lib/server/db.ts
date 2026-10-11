import { Pool } from "pg";
import type { PoolClient, QueryResultRow } from "pg";

/**
 * Café Circle AI — Postgres access layer.
 *
 * Optional SQL migration runner only; app routes and seeding use supabase.ts.
 * A single lazily-created `pg` pool backs migration queries. `DATABASE_URL` is read
 * inside functions rather than at module scope, so merely importing this module
 * (for a type, or during a prerender) never throws and never opens sockets.
 *
 * NOTE: deliberately no `import "server-only"` here. This module is also
 * imported by the CLI scripts (`scripts/migrate.ts`, `scripts/seed.ts`), which
 * run under `tsx`/Node where the `server-only` marker throws by design because
 * Next's bundler alias is not applied. It is still server-only in practice:
 * nothing under `app/` or `components/` may import it.
 */

/**
 * The pool is cached on `globalThis` so Next.js dev hot-reload does not leak a
 * new pool — and a new set of TCP connections — on every module re-evaluation.
 */
const globalForPool = globalThis as typeof globalThis & {
  __cafeCirclePool?: Pool;
};

function readDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  return url && url.trim().length > 0 ? url : undefined;
}

/** One message, so every "not configured" path names the same two things. */
function missingDatabaseUrlError(): Error {
  const error = new Error(
    "DATABASE_URL is not configured in .env. Set it to the Supabase transaction-pooler connection string.",
  );
  // Tagged so the API layer can turn this into actionable setup guidance
  // instead of a generic 500.
  (error as Error & { code?: string }).code = "DB_NOT_CONFIGURED";
  return error;
}

export function getPool(): Pool {
  const cached = globalForPool.__cafeCirclePool;
  if (cached) return cached;

  const connectionString = readDatabaseUrl();
  if (!connectionString) {
    throw missingDatabaseUrlError();
  }

  const pool = new Pool({
    connectionString,
    /*
     * TLS stays fully verified. If the pooler's certificate chain cannot be
     * validated from this network, supply the Supabase CA PEM through
     * DATABASE_SSL_CA in .env instead of weakening verification.
     * We never set rejectUnauthorized to false — a failed handshake is a
     * configuration problem to fix, not to bypass.
     */
    ssl: {
      rejectUnauthorized: true,
      ca: process.env.DATABASE_SSL_CA || undefined,
    },
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    application_name: "cafe-circle-ai",
  });

  globalForPool.__cafeCirclePool = pool;
  return pool;
}

export async function assertDatabaseConfigured(): Promise<void> {
  if (!readDatabaseUrl()) {
    throw missingDatabaseUrlError();
  }
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  // Parameterized queries only: values travel over the wire separately from
  // the SQL text, so user input can never be interpreted as SQL.
  const result = await getPool().query<T>(text, [...params]);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch (rollbackError) {
      // A failed rollback must not mask the original failure.
      console.error("[db] rollback failed", rollbackError);
    }
    throw error;
  } finally {
    // Always return the connection to the pool, success or failure.
    client.release();
  }
}

export async function healthCheck(): Promise<{ now: string; serverVersion: string }> {
  const row = await queryOne<{ now: string; server_version: string }>(
    "select now()::text as now, version() as server_version",
  );
  if (!row) {
    throw new Error("Database health check returned no rows.");
  }
  return { now: row.now, serverVersion: row.server_version };
}

export async function closePool(): Promise<void> {
  const pool = globalForPool.__cafeCirclePool;
  // Clear the cache first so a later getPool() builds a fresh pool while this
  // one drains. CLI scripts call this so the process can exit cleanly.
  globalForPool.__cafeCirclePool = undefined;
  if (pool) {
    await pool.end();
  }
}
