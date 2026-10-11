import { z } from "zod";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const AI_TAGS = ["sweet", "bitter", "strong", "cold", "hot", "creamy", "caramel", "chocolatey", "nutty", "fruity", "smooth", "savoury", "coffee", "tea"] as const;
const text = (max: number) => z.string().trim().min(1).max(max);
const id = text(100);
const strings = z.array(text(80)).max(12);
export const extractedItemSchema = z.object({
  name: text(160), category: z.enum(["food", "drink", "unknown"]),
  priceINR: z.number().finite().min(0).max(100000).nullable(),
  description: text(600).nullable(), ingredients: strings,
  tags: z.array(z.enum(AI_TAGS)).max(14),
});
export const rawExtractionSchema = z.object({ items: z.array(extractedItemSchema).max(60), warnings: z.array(text(300)).max(10) });
export const menuItemSchema = extractedItemSchema.extend({ id, source: z.enum(["uploaded_menu", "application_menu"]) });
export const extractionSchema = z.object({ items: z.array(menuItemSchema).max(60), warnings: z.array(text(300)).max(10) });
const preferences = z.object({
  sweetness: z.number().min(1).max(5).nullable(), bitterness: z.number().min(1).max(5).nullable(),
  temperature: z.enum(["hot", "cold", "both"]).nullable(), favoriteFlavors: strings,
});
const memory = z.object({ id, itemId: id.nullable(), itemName: text(160), cafeName: text(120), rating: z.number().min(1).max(5), note: text(300).nullable() });
export const contextSchema = z.object({
  user: z.object({ id, preferences, dislikedIngredients: strings, dietaryRestrictions: strings, budgetINR: z.number().min(0).max(100000).nullable() }),
  memory: z.array(memory).max(20),
  friends: z.array(z.object({
    id, name: text(80), preferences,
    sharedRecommendations: z.array(memory.extend({ shared: z.literal(true) })).max(10),
  })).max(5),
  menu: z.array(menuItemSchema).min(1).max(60),
  rankedCandidates: z.array(z.object({ itemId: id, rank: z.number().int().min(1).max(60), evidence: z.array(text(300)).max(5) })).max(12),
}).superRefine((ctx, check) => {
  const ids = ctx.menu.map((item) => item.id);
  if (new Set(ids).size !== ids.length) check.addIssue({ code: "custom", message: "Menu IDs must be unique." });
  const candidates = ctx.rankedCandidates;
  if (new Set(candidates.map((c) => c.itemId)).size !== candidates.length || new Set(candidates.map((c) => c.rank)).size !== candidates.length)
    check.addIssue({ code: "custom", message: "Candidate IDs and ranks must be unique." });
  for (const c of candidates) if (!ids.includes(c.itemId)) check.addIssue({ code: "custom", message: "Candidates must exist in the current menu." });
});
export const recommendationRequestSchema = z.object({ context: contextSchema });
export const askRequestSchema = z.object({ context: contextSchema, question: text(500) });
export const selectionSchema = z.object({
  itemId: id, evidenceIds: z.array(id).min(1).max(3),
});
export const recommendSelectionSchema = z.object({ recommendations: z.array(selectionSchema).max(6) });
/** Free-form model prose never reaches the client: all factual sentences come from the fact bank. */
export const askSelectionSchema = z.object({
  status: z.enum(["answer", "no_match", "out_of_domain"]),
  budgetINR: z.number().min(0).max(100000).nullable(),
  temperature: z.enum(["cold", "hot"]).nullable(),
  untriedOnly: z.boolean(),
  evidenceIds: z.array(id).max(3),
  recommendations: z.array(selectionSchema).max(4),
});
const recommendation = z.object({ itemId: id, reason: text(1400), friendEvidence: text(1000).nullable(), memoryEvidence: text(1000).nullable() });
export const recommendationResponseSchema = z.object({ recommendations: z.array(recommendation).max(6), warnings: z.array(text(300)).max(10) });
export const askResponseSchema = z.object({ answer: text(5000), itemIds: z.array(id).max(4), recommendations: z.array(recommendation).max(4), warnings: z.array(text(300)).max(10) });
