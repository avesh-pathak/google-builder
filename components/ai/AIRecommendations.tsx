"use client";

import { useEffect, useRef, useState } from "react";
import { buttonPrimary } from "@/lib/ui";
import { recommendationResponseSchema } from "@/lib/ai/schemas";
import type { AIContext, AIRecommendationResponse } from "@/lib/ai/types";
import { aiRequest, requestError } from "./request";

export function AIRecommendations({ context }: { context: AIContext }) {
  const [result, setResult] = useState<AIRecommendationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function recommend() {
    controller.current?.abort();
    const active = new AbortController(); controller.current = active;
    setBusy(true); setError(null); setResult(null);
    try { const data = await aiRequest("/api/ai/recommend", { context }, recommendationResponseSchema, active.signal); if (!active.signal.aborted) setResult(data); }
    catch (e) { if (!active.signal.aborted) setError(requestError(e)); }
    finally { if (!active.signal.aborted) setBusy(false); }
  }
  return <section aria-labelledby="ai-recommendations-title" className="space-y-4">
    <h2 id="ai-recommendations-title" className="font-display text-xl font-semibold">Your next order</h2>
    <p className="text-sm text-espresso-600">Your app ranks the options. Gemini picks relevant evidence from your tastes, past orders and shared friend ratings.</p>
    <button className={buttonPrimary} onClick={recommend} disabled={busy || !context.rankedCandidates.length}>{busy ? "Finding reasons for your next order…" : "Get Personalized Recommendations"}</button>
    {!context.rankedCandidates.length ? <p className="text-sm text-espresso-600">No ranked candidates are available. Review item categories or try another profile.</p> : null}
    {error ? <p role="alert" className="text-sm text-caramel-700">{error} You can still browse the menu.</p> : null}
    <div aria-live="polite" aria-busy={busy} className="space-y-3">
      {result?.warnings.map((w) => <p key={w} className="text-sm text-espresso-600">{w}</p>)}
      {result && !result.recommendations.length ? <p>No supported recommendations for this menu and budget.</p> : null}
      {result?.recommendations.map((r) => <article key={r.itemId} className="rounded-2xl border border-cream-300 bg-white p-4">
        <h3 className="font-semibold">{context.menu.find((m) => m.id === r.itemId)?.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-espresso-600">{r.reason}</p>
      </article>)}
    </div>
  </section>;
}
