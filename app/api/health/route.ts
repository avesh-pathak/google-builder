import { connection } from "next/server";
import { healthCheck } from "@/lib/server/supabase";
import { databaseError, json } from "@/lib/server/http";

/**
 * GET /api/health — liveness probe for the database dependency.
 *
 * `connection()` is required because Cache Components are enabled: it forces
 * request-time rendering so the production build never evaluates this handler
 * (and therefore never needs a live database) at build time.
 */
export async function GET() {
  await connection();
  try {
    const { now } = await healthCheck();

    return json({ ok: true, database: "connected", transport: "supabase-api", now });
  } catch (error) {
    // 503 for a missing/unreachable database rather than 500: the service is up,
    // its dependency is not. `databaseError` gives setup problems an actionable
    // message and never returns the raw driver error.
    return databaseError(error, "GET /api/health");
  }
}
