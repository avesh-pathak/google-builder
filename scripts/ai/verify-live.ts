import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { analyzeMenu } from "../../lib/ai/menu-analyzer";
import { recommend, askMenu } from "../../lib/ai/recommendations";
import { demoContext, DEMO_AI_MENU } from "../../lib/ai/demo-adapter";
import { errorResponse } from "../../lib/ai/errors";

async function main() {
  loadEnvConfig(process.cwd());
  if (!process.env.GEMINI_API_KEY) { console.log("BLOCKED: GEMINI_API_KEY is missing."); process.exitCode = 1; return; }
  const context = demoContext(DEMO_AI_MENU, "avesh", 250);
  try {
    const result = await recommend(context);
    console.log("LIVE recommendation:", JSON.stringify(result));
  } catch (error) {
    const response = errorResponse(error);
    console.log("LIVE Gemini blocked:", response.status, await response.text()); process.exitCode = 1; return;
  }
  const directory = path.join(process.env.LOCALAPPDATA || ".", "Temp", "opencode", "cafe-ai-tests");
  for (const [file, type] of [["menu.jpg", "image/jpeg"], ["menu.png", "image/png"], ["menu.webp", "image/webp"], ["unreadable.png", "image/png"]]) {
    const result = await analyzeMenu(new File([await readFile(path.join(directory, file))], file, { type }));
    console.log(`LIVE ${file}:`, JSON.stringify(result));
  }
  for (const question of ["What should I try?", "What would Riya recommend?", "Suggest something cold under ₹250.", "I want something different from my previous orders.", "Which item matches my taste?"]) {
    console.log(`LIVE question ${question}:`, JSON.stringify(await askMenu(context, question)));
  }
}
main().catch(async (error) => { const response = errorResponse(error); console.log("LIVE verification failed:", response.status, await response.text()); process.exitCode = 1; });
