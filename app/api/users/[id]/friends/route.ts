import { connection } from "next/server";
import { getFriendActivity } from "@/lib/server/repositories";
import { badRequest, databaseError, json } from "@/lib/server/http";
import { parseId } from "@/lib/server/validators";

/**
 * GET /api/users/[id]/friends — friend ids plus the friend visits the viewer is
 * allowed to see.
 *
 * PRIVACY: `getFriendActivity` already filters to visits a friend explicitly
 * marked as *shared*; private visits never leave the backend. The user id in the
 * path is a DEMO identifier, NOT authentication — it is not a security
 * boundary — so this handler must never grow a parameter that could widen the
 * shared-only filter (e.g. "includePrivate" or "friendId").
 *
 * `connection()` is required because Cache Components are enabled: it forces
 * request-time rendering so the production build never evaluates this handler
 * (and therefore never needs a live database) at build time.
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  await connection();
  try {

    // Route params are async in Next.js 16.
    const { id } = await ctx.params;
    const userId = parseId(id);
    if (!userId) return badRequest("A valid user id is required.");

    const { friendIds, sharedVisits } = await getFriendActivity(userId);

    return json({ friendIds, sharedVisits });
  } catch (error) {
    return databaseError(error, "GET /api/users/[id]/friends");
  }
}
