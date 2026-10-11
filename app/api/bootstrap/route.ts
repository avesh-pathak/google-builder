import { connection } from "next/server";
import { getBootstrapSnapshot } from "@/lib/server/repositories";
import { databaseError, json } from "@/lib/server/http";

/**
 * GET /api/bootstrap — the single call that initialises the app.
 *
 * Returns the exact `BootstrapSnapshot` (users, cafes, menu, visits, tastings
 * and the favourites map per user).
 *
 * `connection()` is required because Cache Components are enabled: it forces
 * request-time rendering so the production build never evaluates this handler
 * (and therefore never needs a live database) at build time.
 */
export async function GET() {
  await connection();
  try {
    const snapshot = await getBootstrapSnapshot();

    return json(snapshot);
  } catch (error) {
    // Setup problems (missing DATABASE_URL, missing schema) get actionable
    // guidance; everything else stays generic.
    return databaseError(error, "GET /api/bootstrap");
  }
}
