import "server-only";
import { GoogleGenAI, type Part } from "@google/genai";
import { z } from "zod";
import { AIError } from "./errors";

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

export async function generateStructured<T>(schema: z.ZodType<T>, systemInstruction: string, parts: Part[], signal?: AbortSignal): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || /YOUR_|PLACEHOLDER/i.test(apiKey)) throw new AIError(503, "AI_NOT_CONFIGURED", "AI is not configured. Set GEMINI_API_KEY on the server.");
  const client = new GoogleGenAI({ apiKey, vertexai: false, httpOptions: { timeout: 30000, retryOptions: { attempts: 1 } } });
  const response = await client.models.generateContent({
    model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    contents: [{ role: "user", parts }],
    config: { systemInstruction, responseMimeType: "application/json", responseJsonSchema: z.toJSONSchema(schema), maxOutputTokens: 8192, abortSignal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000) },
  });
  try {
    if (!response.text || response.text.length > 100000) throw new Error("Empty or oversized response");
    return schema.parse(JSON.parse(response.text));
  } catch {
    throw new AIError(502, "INVALID_AI_OUTPUT", "Unable to read Gemini's response. Try a clearer photo or try again.");
  }
}
