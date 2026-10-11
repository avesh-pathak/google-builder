import { z } from "zod";

export async function aiRequest<T>(path: string, body: FormData | object, schema: z.ZodType<T>, signal: AbortSignal): Promise<T> {
  const multipart = body instanceof FormData;
  const response = await fetch(path, {
    method: "POST", body: multipart ? body : JSON.stringify(body),
    headers: multipart ? undefined : { "Content-Type": "application/json" },
    signal: AbortSignal.any([signal, AbortSignal.timeout(45000)]),
  });
  const data: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ error: z.object({ message: z.string() }) }).safeParse(data);
    throw new Error(error.success ? error.data.error.message : "AI is unavailable. Please try again.");
  }
  return schema.parse(data);
}

export function requestError(error: unknown) {
  return error instanceof Error && /timeout/i.test(error.name) ? "This request took too long. Please try again." : error instanceof Error ? error.message : "AI is unavailable. Please try again.";
}
