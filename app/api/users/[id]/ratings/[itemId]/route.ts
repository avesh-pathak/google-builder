import { connection } from "next/server";
import { upsertItemRating } from "@/lib/server/repositories";
import { badRequest, databaseError, json, notFound } from "@/lib/server/http";
import { parseId, parseRating } from "@/lib/server/validators";

/** Repositories signal missing rows with a machine-readable `.code`. */
function repositoryErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/** Read one field from an untrusted JSON body without assuming its shape. */
function readField(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) return undefined;
  return (value as Record<string, unknown>)[key];
}

/**
 * PUT /api/users/[id]/ratings/[itemId] — set the user's explicit opinion of an
 * item ("I tried this from the menu"), independent of any café visit.
 *
 * Idempotent: re-rating an item updates the existing rating.
 *
 * `connection()` is required because Cache Components are enabled: it forces
 * request-time rendering so the production build never evaluates this handler
 * (and therefore never needs a live database) at build time.
 */
export async function PUT(
  request: Request,
  ctx: { params: Promise<{ id: string; itemId: string }> },
) {
  await connection();
  try {

    // Route params are async in Next.js 16.
    const { id, itemId } = await ctx.params;
    const userId = parseId(id);
    if (!userId) return badRequest("A valid user id is required.");
    const menuItemId = parseId(itemId);
    if (!menuItemId) return badRequest("A valid menu item id is required.");

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Request body must be valid JSON.");
    }

    const rating = parseRating(readField(body, "rating"));
    if (rating === null) {
      return badRequest("Rating must be an integer from 1 to 5.");
    }

    const tasting = await upsertItemRating(userId, menuItemId, rating);

    return json(tasting);
  } catch (error) {
    const code = repositoryErrorCode(error);
    if (code === "USER_NOT_FOUND") return notFound("User not found.");
    if (code === "ITEM_NOT_FOUND") return notFound("Menu item not found.");

    return databaseError(error, "PUT /api/users/[id]/ratings/[itemId]");
  }
}
