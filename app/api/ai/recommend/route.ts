import { readJSON, jsonResponse } from "@/lib/ai/http";
import { recommendationRequestSchema } from "@/lib/ai/schemas";
import { recommend } from "@/lib/ai/recommendations";
import { errorResponse } from "@/lib/ai/errors";

export async function POST(request: Request) {
  try { const { context } = await readJSON(request, recommendationRequestSchema); return jsonResponse(await recommend(context, request.signal)); }
  catch (error) { return errorResponse(error); }
}
