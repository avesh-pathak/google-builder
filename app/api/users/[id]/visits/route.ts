import { connection } from "next/server";
import { getUser, getVisitsForUser } from "@/lib/server/repositories";
import { badRequest, databaseError, json, notFound } from "@/lib/server/http";
import { parseId } from "@/lib/server/validators";

/**
 * GET /api/users/[id]/visits — the caller's own visit history.
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

    // Distinguish "unknown user" from "user with no visits" so the client can
    // show the right empty/error state.
    const user = await getUser(userId);
    if (!user) return notFound("User not found.");

    const visits = await getVisitsForUser(userId);

    return json({ visits });
  } catch (error) {
    return databaseError(error, "GET /api/users/[id]/visits");
  }
}
