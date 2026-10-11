import { connection } from "next/server";
import { addFavorite, removeFavorite } from "@/lib/server/repositories";
import { badRequest, databaseError, json, notFound } from "@/lib/server/http";
import { parseId } from "@/lib/server/validators";

/** Repositories signal missing rows with a machine-readable `.code`. */
function repositoryErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/**
 * PUT /api/users/[id]/favorites/[itemId] — mark a menu item as a favourite.
 *
 * Idempotent: re-favouriting an existing favourite is a no-op upsert.
 *
 * `connection()` is required because Cache Components are enabled: it forces
 * request-time rendering so the production build never evaluates this handler
 * (and therefore never needs a live database) at build time.
 */
export async function PUT(
  _request: Request,
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

    await addFavorite(userId, menuItemId);

    return json({ userId, menuItemId, favorite: true });
  } catch (error) {
    const code = repositoryErrorCode(error);
    if (code === "USER_NOT_FOUND") return notFound("User not found.");
    if (code === "ITEM_NOT_FOUND") return notFound("Menu item not found.");

    return databaseError(error, "PUT /api/users/[id]/favorites/[itemId]");
  }
}

/**
 * DELETE /api/users/[id]/favorites/[itemId] — remove a favourite.
 *
 * Idempotent: removing a favourite that is not present is a no-op.
 *
 * `connection()` is required because Cache Components are enabled: it forces
 * request-time rendering so the production build never evaluates this handler
 * (and therefore never needs a live database) at build time.
 */
export async function DELETE(
  _request: Request,
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

    await removeFavorite(userId, menuItemId);

    return json({ userId, menuItemId, favorite: false });
  } catch (error) {
    const code = repositoryErrorCode(error);
    if (code === "USER_NOT_FOUND") return notFound("User not found.");
    if (code === "ITEM_NOT_FOUND") return notFound("Menu item not found.");

    return databaseError(error, "DELETE /api/users/[id]/favorites/[itemId]");
  }
}
