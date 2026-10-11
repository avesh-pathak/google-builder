import "server-only";

import type { Budget, TastePreferences, Temperature } from "@/lib/types";

/**
 * Café Circle AI — request validators.
 *
 * Pure functions: no I/O, no `pg`, no imports from other server modules. Every
 * parser returns the parsed value or `null` on any invalid input, so callers
 * can `if (parsed === null) return badRequest(...)` without try/catch.
 */

/** `YYYY-MM-DD`, exactly. */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The safe charset for ids we accept from the wire: letters, digits and
 * `._:-`. Deliberately excludes whitespace, slashes and quotes.
 */
const ID_PATTERN = /^[A-Za-z0-9._:-]+$/;

export function isNonEmptyString(value: unknown, maxLength?: number): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  return maxLength === undefined || trimmed.length <= maxLength;
}

export function parseRating(value: unknown): number | null {
  // Integers only: a rating is 1..5, never "4", 4.5 or NaN.
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  return value >= 1 && value <= 5 ? value : null;
}

export function parseIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  // Round-trip through Date.UTC and compare parts: this rejects impossible
  // calendar dates such as 2026-02-31 (which would otherwise roll over) and
  // out-of-range months/days.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return value;
}

export function parseTemperature(value: unknown): Temperature | null {
  switch (value) {
    case "hot":
    case "cold":
    case "both":
      return value;
    default:
      return null;
  }
}

export function parseBudget(value: unknown): Budget | null {
  switch (value) {
    case "value":
    case "balanced":
    case "premium":
      return value;
    default:
      return null;
  }
}

export function parseStringArray(
  value: unknown,
  maxItems = 12,
  maxLength = 40,
): string[] | null {
  if (!Array.isArray(value)) return null;

  const entries: unknown[] = value;
  const seen = new Set<string>();
  const result: string[] = [];

  for (const entry of entries) {
    if (typeof entry !== "string") return null;

    const trimmed = entry.trim();
    if (trimmed.length === 0) continue; // drop empties
    if (trimmed.length > maxLength) return null;

    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue; // de-duplicate case-insensitively
    seen.add(key);
    result.push(trimmed);
  }

  // The cap applies to the resulting list, after trimming and de-duplication.
  return result.length > maxItems ? null : result;
}

/** The only keys a preferences PATCH may carry. */
const PREFERENCE_KEYS = new Set<string>([
  "sweetness",
  "bitterness",
  "temperature",
  "favoriteFlavors",
  "dislikedIngredients",
  "budget",
]);

export function parsePreferencesPatch(value: unknown): Partial<TastePreferences> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length === 0) return null;

  // Unknown keys are rejected outright rather than silently ignored: a typo
  // like "sweetnes" would otherwise look like a successful update that did
  // nothing. Failing loudly keeps the client honest.
  for (const key of keys) {
    if (!PREFERENCE_KEYS.has(key)) return null;
  }

  const patch: Partial<TastePreferences> = {};

  if ("sweetness" in record) {
    const sweetness = parseRating(record.sweetness);
    if (sweetness === null) return null;
    patch.sweetness = sweetness;
  }

  if ("bitterness" in record) {
    const bitterness = parseRating(record.bitterness);
    if (bitterness === null) return null;
    patch.bitterness = bitterness;
  }

  if ("temperature" in record) {
    const temperature = parseTemperature(record.temperature);
    if (temperature === null) return null;
    patch.temperature = temperature;
  }

  if ("favoriteFlavors" in record) {
    const flavors = parseStringArray(record.favoriteFlavors, 12, 40);
    if (flavors === null) return null;
    patch.favoriteFlavors = flavors;
  }

  if ("dislikedIngredients" in record) {
    const disliked = parseStringArray(record.dislikedIngredients, 12, 40);
    if (disliked === null) return null;
    patch.dislikedIngredients = disliked;
  }

  if ("budget" in record) {
    const budget = parseBudget(record.budget);
    if (budget === null) return null;
    patch.budget = budget;
  }

  return patch;
}

export function parseCreateVisit(value: unknown): {
  userId: string;
  cafeName: string;
  visitedAt: string;
  note: string | null;
  shared: boolean;
  items: { menuItemId: string | null; itemName: string; rating: number }[];
} | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;

  const userId = parseId(record.userId);
  if (userId === null) return null;

  const rawCafeName = record.cafeName;
  if (!isNonEmptyString(rawCafeName, 120)) return null;
  const cafeName = rawCafeName.trim();

  const visitedAt = parseIsoDate(record.visitedAt);
  if (visitedAt === null) return null;

  if (typeof record.shared !== "boolean") return null;
  const shared = record.shared;

  // note is optional; absent, null or blank collapses to null.
  let note: string | null = null;
  const rawNote = record.note;
  if (rawNote !== undefined && rawNote !== null) {
    if (typeof rawNote !== "string") return null;
    const trimmed = rawNote.trim();
    note = trimmed.length === 0 ? null : trimmed;
  }
  if (note !== null && note.length > 1000) return null;

  if (!Array.isArray(record.items)) return null;
  const rawItems: unknown[] = record.items;
  if (rawItems.length < 1 || rawItems.length > 20) return null;

  const items: { menuItemId: string | null; itemName: string; rating: number }[] = [];
  for (const rawItem of rawItems) {
    if (typeof rawItem !== "object" || rawItem === null || Array.isArray(rawItem)) return null;
    const item = rawItem as Record<string, unknown>;

    const rawItemName = item.itemName;
    if (!isNonEmptyString(rawItemName, 160)) return null;
    const itemName = rawItemName.trim();

    const rating = parseRating(item.rating);
    if (rating === null) return null;

    let menuItemId: string | null = null;
    if (item.menuItemId !== undefined && item.menuItemId !== null) {
      const parsedMenuItemId = parseId(item.menuItemId);
      if (parsedMenuItemId === null) return null;
      menuItemId = parsedMenuItemId;
    }

    items.push({ menuItemId, itemName, rating });
  }

  return { userId, cafeName, visitedAt, note, shared, items };
}

export function parseId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 120) return null;
  if (!ID_PATTERN.test(trimmed)) return null;
  return trimmed;
}
