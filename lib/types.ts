/**
 * Café Circle AI — shared domain types.
 *
 * These models are deliberately backend-shaped so Phase 2/3 can swap the
 * localStorage store for API calls without touching UI code.
 */

export type ItemCategory = "drinks" | "food";

export type Temperature = "hot" | "cold" | "both";

export type Budget = "value" | "balanced" | "premium";

export interface TastePreferences {
  /** 1 (barely) – 5 (very) */
  sweetness: number;
  /** 1 (mild) – 5 (bold) */
  bitterness: number;
  temperature: Temperature;
  favoriteFlavors: string[];
  /** Ingredients the user avoids; matching items are excluded from suggestions. */
  dislikedIngredients: string[];
  budget: Budget;
}

export interface User {
  id: string;
  name: string;
  initials: string;
  /** Warm accent used for the avatar. */
  color: string;
  bio: string;
  preferences: TastePreferences;
  /** Menu item id the user orders most often. */
  usualOrderId: string;
  usualNote: string;
  friendIds: string[];
}

export interface Cafe {
  id: string;
  name: string;
  area: string;
  blurb: string;
  image: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  /** Fictional price in INR. */
  price: number;
  category: ItemCategory;
  tags: string[];
  image: string;
}

export interface VisitItem {
  /** Links back to the menu catalogue when the item is a known menu item. */
  menuItemId?: string;
  name: string;
  /** 1 – 5 */
  rating: number;
}

export interface Visit {
  id: string;
  userId: string;
  cafeId: string;
  /** ISO date: YYYY-MM-DD */
  date: string;
  items: VisitItem[];
  note?: string;
  /** Friend-visibility flag. Private visits never surface in Friends. */
  shared: boolean;
  source: "seed" | "manual";
}

/** A rating added straight from the menu explorer (no café visit implied). */
export interface Tasting {
  id: string;
  userId: string;
  menuItemId: string;
  /** 1 – 5 */
  rating: number;
  /** ISO date: YYYY-MM-DD */
  date: string;
}

export interface TasteTagMeta {
  id: string;
  label: string;
}
