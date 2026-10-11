import { connection } from "next/server";
import { resetDemoData } from "@/lib/server/seed";
import { badRequest, databaseError, json, notFound } from "@/lib/server/http";

/** Read one field from an untrusted JSON body without assuming its shape. */
function readField(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) return undefined;
  return (value as Record<string, unknown>)[key];
}

/**
 * POST /api/dev/reset — DEVELOPMENT ONLY.
 *
 * Truncates and re-seeds the application-owned tables (users, cafes, menu_items,
 * friendships, visits, visit_items, user_favorites, item_ratings). It never
 * touches Supabase system tables or app_migrations.
 *
 * The production check runs *before* `try` on purpose: an unknown endpoint must
 * answer 404, never 500. It also avoids leaking the handler's existence.
 *
 * `connection()` is required because Cache Components are enabled: it forces
 * request-time rendering so the production build never evaluates this handler
 * (and therefore never needs a live database) at build time.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return notFound();
  }

  await connection();
  try {

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Request body must be valid JSON.");
    }

    if (readField(body, "confirm") !== "RESET_DEMO_DATA") {
      return badRequest('Provide { "confirm": "RESET_DEMO_DATA" } to reset demo data.');
    }

    const counts = await resetDemoData();

    return json({ ok: true, counts });
  } catch (error) {
    return databaseError(error, "POST /api/dev/reset");
  }
}
