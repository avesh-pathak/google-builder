import type { z } from "zod";
import type { contextSchema, menuItemSchema, extractionSchema, recommendationResponseSchema, askResponseSchema } from "./schemas";

/** No database dependency. Only authorized, relevant records belong here. */
export type AIContext = z.infer<typeof contextSchema>;
export type AIMenuItem = z.infer<typeof menuItemSchema>;
export type MenuExtraction = z.infer<typeof extractionSchema>;
export type AIRecommendationResponse = z.infer<typeof recommendationResponseSchema>;
export type AskMenuResponse = z.infer<typeof askResponseSchema>;
export interface EvidenceFact {
  id: string;
  text: string;
  kind: "menu" | "preference" | "memory" | "friend";
  /** Null denotes general context, not a claim about this exact menu item. */
  itemId: string | null;
}
