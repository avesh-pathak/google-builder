import { readJSON, jsonResponse } from "@/lib/ai/http";
import { askRequestSchema } from "@/lib/ai/schemas";
import { askMenu } from "@/lib/ai/recommendations";
import { errorResponse } from "@/lib/ai/errors";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try { const { context, question } = await readJSON(request, askRequestSchema); return jsonResponse(await askMenu(context, question, request.signal)); }
  catch (error) { return errorResponse(error); }
}
