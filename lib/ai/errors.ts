export class AIError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof AIError) return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status, headers: { "Cache-Control": "no-store" } });
  // Never echo provider messages, prompts, user records, or credentials.
  const status = typeof error === "object" && error !== null && "status" in error ? Number(error.status) : 0;
  const timeout = error instanceof Error && /timeout|abort/i.test(error.name + error.message);
  return Response.json({ error: {
    code: status === 429 ? "RATE_LIMITED" : timeout ? "TIMEOUT" : "AI_UNAVAILABLE",
    message: status === 429 ? "Gemini quota or rate limit reached. Please try again later." : timeout ? "Gemini took too long. Please try again." : "Gemini is temporarily unavailable. Please try again.",
  } }, { status: status === 429 ? 429 : timeout ? 504 : 503, headers: { "Cache-Control": "no-store" } });
}
