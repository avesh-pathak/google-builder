import { AIError } from "./errors";
import type { AIContext, AIMenuItem, AIRecommendationResponse, EvidenceFact } from "./types";

/** Safety filtering only; the application remains the sole ranking authority. */
export function eligibleCandidates(context: AIContext, budget = context.user.budgetINR) {
  return [...context.rankedCandidates].sort((a, b) => a.rank - b.rank).filter((candidate) => {
    const item = context.menu.find((m) => m.id === candidate.itemId)!;
    if (item.category === "unknown") return false;
    if (budget !== null && (item.priceINR === null || item.priceINR > budget)) return false;
    const text = [item.name, item.description, ...item.ingredients, ...item.tags].join(" ").toLowerCase();
    if (context.user.dislikedIngredients.some((i) => text.includes(i.toLowerCase()))) return false;
    // OCR ingredient lists are not complete, verified allergen/dietary declarations.
    // Do not offer dietary-safe recommendations from this MVP contract.
    return context.user.dietaryRestrictions.length === 0;
  });
}

export function safetyWarnings(context: AIContext) {
  const warnings: string[] = [];
  if (context.user.dietaryRestrictions.length) warnings.push("Dietary restrictions require confirmation from café staff. This menu does not verify ingredient completeness or allergen safety.");
  if (context.user.budgetINR !== null && context.menu.some((m) => m.priceINR === null)) warnings.push("Items with unknown prices are excluded from budget-limited recommendations.");
  return warnings;
}

export function evidenceFacts(context: AIContext): EvidenceFact[] {
  const facts: EvidenceFact[] = [];
  const add = (kind: EvidenceFact["kind"], text: string, itemId: string | null = null) => {
    facts.push({ id: `fact-${facts.length + 1}`, kind, text, itemId });
  };
  for (const item of context.menu) {
    add("menu", `${item.name}${item.priceINR === null ? " has no readable INR price" : ` costs ₹${item.priceINR}`}.`, item.id);
    if (item.tags.length) add("menu", `${item.name} is tagged ${item.tags.join(", ")}.`, item.id);
    if (item.description) add("menu", `The menu describes ${item.name} as: ${item.description}`, item.id);
  }
  const p = context.user.preferences;
  if (p.temperature && p.temperature !== "both") add("preference", `You prefer ${p.temperature} drinks.`);
  if (p.sweetness !== null) add("preference", `Your recorded sweetness preference is ${p.sweetness}/5.`);
  if (p.bitterness !== null) add("preference", `Your recorded bitterness preference is ${p.bitterness}/5.`);
  if (p.favoriteFlavors.length) add("preference", `Your selected favorite flavors include ${p.favoriteFlavors.join(", ")}.`);
  if (context.user.budgetINR !== null) add("preference", `Your current budget is ₹${context.user.budgetINR}.`);
  for (const m of context.memory) {
    add("memory", `You previously rated ${m.itemName} ${m.rating}/5 at ${m.cafeName}.`, matchingItem(context.menu, m.itemId, m.itemName));
    if (m.note) add("memory", `Your recorded note for ${m.itemName}: ${m.note}`, matchingItem(context.menu, m.itemId, m.itemName));
  }
  for (const friend of context.friends) {
    if (friend.preferences.temperature && friend.preferences.temperature !== "both" && friend.preferences.temperature === p.temperature)
      add("friend", `You and ${friend.name} both prefer ${p.temperature} drinks.`);
    for (const m of friend.sharedRecommendations) {
      if (!m.shared) continue;
      add("friend", `${friend.name} shared a ${m.rating}/5 rating for ${m.itemName} at ${m.cafeName}.`, matchingItem(context.menu, m.itemId, m.itemName));
      if (m.note) add("friend", `${friend.name}'s shared note for ${m.itemName}: ${m.note}`, matchingItem(context.menu, m.itemId, m.itemName));
    }
  }
  return facts;
}

function matchingItem(menu: AIMenuItem[], id: string | null, name: string) {
  return menu.find((m) => m.source === "application_menu" && m.id === id && m.name === name)?.id ?? null;
}

export function resolveFacts(ids: string[], facts: EvidenceFact[], itemId?: string) {
  const selected = [...new Set(ids)].map((id) => facts.find((f) => f.id === id));
  if (selected.some((fact) => !fact || (itemId && fact.itemId && fact.itemId !== itemId)))
    throw new AIError(502, "UNGROUNDED_OUTPUT", "Gemini returned an unsupported reference. Please try again.");
  return selected as EvidenceFact[];
}

export function groundRecommendations(context: AIContext, selections: { itemId: string; evidenceIds: string[] }[], facts: EvidenceFact[]): AIRecommendationResponse["recommendations"] {
  const eligible = eligibleCandidates(context);
  const selectedIds = selections.map((s) => s.itemId);
  if (new Set(selectedIds).size !== selectedIds.length || selectedIds.some((id) => !eligible.some((c) => c.itemId === id)))
    throw new AIError(502, "UNGROUNDED_OUTPUT", "Gemini suggested an unavailable or unsuitable item. Please try again.");
  return [...selections].sort((a, b) => eligible.findIndex((c) => c.itemId === a.itemId) - eligible.findIndex((c) => c.itemId === b.itemId)).map((selection) => {
    const selected = resolveFacts(selection.evidenceIds, facts, selection.itemId);
    const item = context.menu.find((m) => m.id === selection.itemId)!;
    return {
      itemId: selection.itemId,
      reason: `${item.name}: ${selected.map((f) => f.text).join(" ")}`,
      friendEvidence: selected.filter((f) => f.kind === "friend").map((f) => f.text).join(" ") || null,
      memoryEvidence: selected.filter((f) => f.kind === "memory").map((f) => f.text).join(" ") || null,
    };
  });
}
