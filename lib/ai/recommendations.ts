import "server-only";
import { generateStructured } from "./client";
import { ASK_PROMPT, RECOMMEND_PROMPT } from "./prompts";
import { askSelectionSchema, recommendSelectionSchema } from "./schemas";
import { eligibleCandidates, evidenceFacts, groundRecommendations, resolveFacts, safetyWarnings } from "./grounding";
import type { AIContext, AIRecommendationResponse, AskMenuResponse } from "./types";

function input(context: AIContext) {
  // Only eligible ranked candidates are exposed as recommendation targets.
  return { user: context.user, menu: context.menu, rankedCandidates: eligibleCandidates(context), facts: evidenceFacts(context) };
}

export async function recommend(context: AIContext, signal?: AbortSignal): Promise<AIRecommendationResponse> {
  const data = input(context);
  const warnings = safetyWarnings(context);
  if (!data.rankedCandidates.length) return { recommendations: [], warnings: [...warnings, "No ranked items meet the current budget and restrictions."] };
  const selected = await generateStructured(recommendSelectionSchema, RECOMMEND_PROMPT, [{ text: JSON.stringify(data) }], signal);
  return { recommendations: groundRecommendations(context, selected.recommendations, data.facts), warnings };
}

export async function askMenu(context: AIContext, question: string, signal?: AbortSignal): Promise<AskMenuResponse> {
  const data = input(context);
  const selected = await generateStructured(askSelectionSchema, ASK_PROMPT, [{ text: JSON.stringify({ question, ...data }) }], signal);
  const warnings = safetyWarnings(context);
  if (selected.status === "out_of_domain") return { answer: "I can help with this café's menu, your taste preferences and shared café memories. Ask me about an order.", itemIds: [], recommendations: [], warnings };
  const budget = selected.budgetINR === null ? context.user.budgetINR : Math.min(selected.budgetINR, context.user.budgetINR ?? Infinity);
  const constrained = { ...context, user: { ...context.user, budgetINR: budget } };
  const triedNames = new Set(context.memory.map((m) => m.itemName.toLowerCase()));
  constrained.rankedCandidates = eligibleCandidates(constrained).filter((c) => {
    const item = context.menu.find((m) => m.id === c.itemId)!;
    return (!selected.temperature || item.tags.includes(selected.temperature)) && (!selected.untriedOnly || !triedNames.has(item.name.toLowerCase()));
  });
  const recommendations = groundRecommendations(constrained, selected.recommendations, data.facts);
  const generalFacts = resolveFacts(selected.evidenceIds, data.facts);
  const paragraphs = [...generalFacts.map((f) => f.text), ...recommendations.map((r) => r.reason)];
  return {
    answer: selected.status === "no_match" || !paragraphs.length ? "I don't have a supported match in the supplied menu and records. Try a different budget or ask café staff about missing details." : paragraphs.join("\n\n"),
    itemIds: recommendations.map((r) => r.itemId), recommendations, warnings,
  };
}
