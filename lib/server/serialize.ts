import "server-only";

import type {
  Budget,
  Cafe,
  ItemCategory,
  MenuItem,
  TastePreferences,
  Temperature,
  Tasting,
  User,
  Visit,
  VisitItem,
} from "@/lib/types";

/**
 * Row → domain mapping.
 *
 * These functions are pure: they take a raw database row (typed loosely as
 * `Record<string, unknown>`) and produce the exact shapes in `lib/types.ts`.
 *
 * Supabase returns numeric values and ISO date/timestamp strings. Coercion
 * remains defensive, and dates are normalized without timezone conversion.
 */

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function optionalText(value: unknown): string | undefined {
  return value === null || value === undefined ? undefined : String(value);
}

function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function bool(value: unknown): boolean {
  return value === true || value === "true" || value === "t" || value === 1;
}

/** `text[]` columns come back as a real array; anything else is treated as empty. */
function textArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
}

function asTemperature(value: unknown): Temperature {
  return value === "hot" || value === "cold" || value === "both" ? value : "both";
}

function asBudget(value: unknown): Budget {
  return value === "value" || value === "premium" ? value : "balanced";
}

function asCategory(value: unknown): ItemCategory {
  return value === "food" ? "food" : "drinks";
}

export function rowToUser(row: Record<string, unknown>, friendIds: string[]): User {
  const preferences: TastePreferences = {
    sweetness: num(row.sweetness),
    bitterness: num(row.bitterness),
    temperature: asTemperature(row.temperature),
    favoriteFlavors: textArray(row.favorite_flavors),
    dislikedIngredients: textArray(row.disliked_ingredients),
    budget: asBudget(row.budget),
  };

  return {
    id: text(row.id),
    name: text(row.name),
    initials: text(row.initials),
    color: text(row.color),
    bio: text(row.bio),
    preferences,
    usualOrderId: text(row.usual_order_id),
    usualNote: text(row.usual_note),
    friendIds,
  };
}

export function rowToCafe(row: Record<string, unknown>): Cafe {
  return {
    id: text(row.id),
    name: text(row.name),
    area: text(row.location),
    blurb: text(row.description),
    image: text(row.image),
  };
}

/** Domain `MenuItem` has no café field, so `cafe_id` is intentionally ignored. */
export function rowToMenuItem(row: Record<string, unknown>): MenuItem {
  return {
    id: text(row.id),
    name: text(row.name),
    description: text(row.description),
    price: num(row.price),
    category: asCategory(row.category),
    tags: textArray(row.taste_tags),
    image: text(row.image),
  };
}

export function rowToVisitItem(row: Record<string, unknown>): VisitItem {
  const menuItemId = optionalText(row.menu_item_id);
  const item: VisitItem = {
    name: text(row.item_name),
    rating: num(row.rating),
  };
  if (menuItemId !== undefined) item.menuItemId = menuItemId;
  return item;
}

export function rowToVisit(row: Record<string, unknown>, items: VisitItem[]): Visit {
  const note = optionalText(row.notes);
  const visit: Visit = {
    id: text(row.id),
    userId: text(row.user_id),
    cafeId: text(row.cafe_id),
    date: text(row.visited_at),
    items,
    shared: bool(row.shared_with_friends),
    source: row.source === "seed" ? "seed" : "manual",
  };
  if (note !== undefined) visit.note = note;
  return visit;
}

/** The domain `Tasting` has a synthetic composite id and dates from `updated_at`. */
export function rowToTasting(row: Record<string, unknown>): Tasting {
  const userId = text(row.user_id);
  const menuItemId = text(row.menu_item_id);
  return {
    id: `${userId}:${menuItemId}`,
    userId,
    menuItemId,
    rating: num(row.rating),
    date: text(row.updated_at).slice(0, 10),
  };
}
