import "server-only";
import { generateStructured } from "./client";
import { AIError } from "./errors";
import { MENU_PROMPT } from "./prompts";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, rawExtractionSchema } from "./schemas";
import type { MenuExtraction } from "./types";

export function validateImage(file: File) {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) throw new AIError(415, "INVALID_IMAGE_TYPE", "Choose a JPEG, PNG or WebP menu photo.");
  if (!file.size) throw new AIError(400, "EMPTY_IMAGE", "This image is empty. Choose another photo.");
  if (file.size > MAX_IMAGE_BYTES) throw new AIError(413, "IMAGE_TOO_LARGE", "Your image is too large. Please upload a file under 5 MB.");
}

export function validateImageSignature(bytes: Uint8Array, mime: string) {
  const png = bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v);
  const jpeg = bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = bytes.length >= 12 && new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (!(mime === "image/png" ? png : mime === "image/jpeg" ? jpeg : mime === "image/webp" && webp))
    throw new AIError(400, "INVALID_IMAGE", "Unable to read this menu. Choose a valid JPEG, PNG or WebP photo.");
}

export async function analyzeMenu(file: File, signal?: AbortSignal): Promise<MenuExtraction> {
  validateImage(file);
  const bytes = new Uint8Array(await file.arrayBuffer());
  validateImageSignature(bytes, file.type);
  const extracted = await generateStructured(rawExtractionSchema, MENU_PROMPT, [
    { text: "Extract this photographed menu. Return only items visible in this image." },
    { inlineData: { mimeType: file.type, data: Buffer.from(bytes).toString("base64") } },
  ], signal);
  return { items: extracted.items.map((item, index) => ({ ...item, id: `extracted-${index + 1}`, source: "uploaded_menu" })), warnings: extracted.warnings };
}
