import { connection } from "next/server";
import { createVisit } from "@/lib/server/repositories";
import { badRequest, databaseError, json, notFound } from "@/lib/server/http";
import { parseCreateVisit } from "@/lib/server/validators";

/** Repositories signal missing rows with a machine-readable `.code`. */
function repositoryErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/**
 * POST /api/visits — record a new café visit with its ordered items.
 *
 * `connection()` is required because Cache Components are enabled: it forces
 * request-time rendering so the production build never evaluates this handler
 * (and therefore never needs a live database) at build time.
 */
export async function POST(request: Request) {
  await connection();
  try {

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest("Request body must be valid JSON.");
    }

    const input = parseCreateVisit(body);
    if (!input) {
      return badRequest(
        "Invalid visit. Expected userId, cafeName, visitedAt (YYYY-MM-DD), shared " +
          "and at least one item with itemName and a rating from 1 to 5.",
      );
    }

    const visit = await createVisit(input);

    return json(visit, { status: 201 });
  } catch (error) {
    const code = repositoryErrorCode(error);
    if (code === "USER_NOT_FOUND") return notFound("User not found.");
    if (code === "ITEM_NOT_FOUND") return notFound("Menu item not found.");

    return databaseError(error, "POST /api/visits");
  }
}
