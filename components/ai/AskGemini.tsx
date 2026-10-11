"use client";

import { useEffect, useRef, useState } from "react";
import { buttonPrimary, buttonSecondary, field } from "@/lib/ui";
import { askResponseSchema } from "@/lib/ai/schemas";
import type { AIContext, AskMenuResponse } from "@/lib/ai/types";
import { aiRequest, requestError } from "./request";

const prompts = ["What should I try?", "What would Riya recommend?", "Suggest something cold under ₹250.", "I want something different from my previous orders.", "Which item matches my taste?"];
export function AskGemini({ context }: { context: AIContext }) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AskMenuResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function ask() {
    if (!question.trim() || busy) return;
    const active = new AbortController(); controller.current = active;
    setBusy(true); setError(null); setResult(null);
    try { const data = await aiRequest("/api/ai/ask-menu", { question: question.trim(), context }, askResponseSchema, active.signal); if (!active.signal.aborted) setResult(data); }
    catch (e) { if (!active.signal.aborted) setError(requestError(e)); }
    finally { if (!active.signal.aborted) setBusy(false); }
  }
  return <section aria-labelledby="ask-gemini-title" className="space-y-4">
    <h2 id="ask-gemini-title" className="font-display text-xl font-semibold">Ask Gemini about this menu</h2>
    <div className="flex flex-wrap gap-2">{prompts.map((p) => <button key={p} type="button" className={buttonSecondary} onClick={() => setQuestion(p)} disabled={busy}>{p}</button>)}</div>
    <form onSubmit={(e) => { e.preventDefault(); void ask(); }} className="space-y-3">
      <label htmlFor="ai-question" className="block text-sm font-medium">Your question</label>
      <textarea id="ai-question" className={field} value={question} maxLength={500} rows={2} placeholder="Something cold, creamy and within my budget?" onChange={(e) => setQuestion(e.target.value)} disabled={busy} />
      <button type="submit" className={buttonPrimary} disabled={busy || !question.trim()}>{busy ? "Checking your menu and memories…" : "Ask Gemini"}</button>
    </form>
    {error ? <p role="alert" className="text-sm text-caramel-700">{error}</p> : null}
    <div aria-live="polite" aria-busy={busy}>
      {result ? <div className="space-y-3 rounded-2xl border border-cream-300 bg-white p-4">
        <p className="whitespace-pre-line text-sm leading-relaxed">{result.answer}</p>
        {result.itemIds.length ? <p className="text-sm font-medium">Menu matches: {result.itemIds.map((id) => context.menu.find((m) => m.id === id)?.name).join(", ")}</p> : null}
        {result.warnings.map((w) => <p key={w} className="text-sm text-espresso-600">{w}</p>)}
      </div> : null}
    </div>
    <p className="text-xs text-espresso-600">One question at a time. No conversation history is saved. Confirm ingredients and allergies with café staff.</p>
  </section>;
}
