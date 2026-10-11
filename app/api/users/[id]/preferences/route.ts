import { connection } from "next/server";
import { updateUserPreferences } from "@/lib/server/repositories";
import { badRequest, databaseError, json, notFound } from "@/lib/server/http";
import { parseId, parsePreferencesPatch } from "@/lib/server/validators";

/**
 * PATCH /api/users/[id]/preferences — partial update of a user's taste profile.
 *
 * `connection()` is required because Cache Components are enabled: it forces
 * request-time rendering so the production build never evaluates this handler
 * (and therefore never needs a live database) at build time.
 */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  await connection();
  try {

    // Route params are async in Next.js 16.
    const { id } = await ctx.params;
    const userId = parseId(id);
    if (!userId) return badRequest("A valid user id is required.");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Request body must be valid JSON.");
    }

    const patch = parsePreferencesPatch(body);
    if (!patch) {
      return badRequest(
        "Invalid preferences. Expected an object with any of: sweetness (1-5), " +
          "bitterness (1-5), temperature ('hot'|'cold'|'both'), favoriteFlavors " +
          "(string[]), dislikedIngredients (string[]), budget ('value'|'balanced'|'premium').",
      );
    }

    const user = await updateUserPreferences(userId, patch);
    if (!user) return notFound("User not found.");

    return json(user);
  } catch (error) {
    return databaseError(error, "PATCH /api/users/[id]/preferences");
  }
}
