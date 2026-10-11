import "server-only";
import { z } from "zod";
import { AIError } from "./errors";

/** Streaming cap works even when Content-Length is absent or dishonest. */
export async function readBoundedBody(request: Request, limit: number): Promise<Uint8Array> {
  if (Number(request.headers.get("content-length")) > limit) throw new AIError(413, "REQUEST_TOO_LARGE", "This request is too large. Please send a smaller menu or image.");
  const reader = request.body?.getReader();
  if (!reader) throw new AIError(400, "MISSING_BODY", "A request body is required.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  const timer = setTimeout(() => { void reader.cancel(); }, 15000);
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) { await reader.cancel(); throw new AIError(413, "REQUEST_TOO_LARGE", "This request is too large. Please send a smaller menu or image."); }
      chunks.push(value);
    }
  } finally { clearTimeout(timer); reader.releaseLock(); }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
  return body;
}

export async function readJSON<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new AIError(415, "INVALID_CONTENT_TYPE", "Send this request as application/json.");
  try {
    const bytes = await readBoundedBody(request, 128 * 1024);
    return schema.parse(JSON.parse(new TextDecoder().decode(bytes)));
  } catch (error) {
    if (error instanceof AIError) throw error;
    throw new AIError(400, "INVALID_CONTEXT", "Invalid AI context. Check field lengths, shared records, menu IDs and candidate ranks.");
  }
}

export function jsonResponse(data: unknown) { return Response.json(data, { headers: { "Cache-Control": "no-store" } }); }
