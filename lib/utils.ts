import type { TastePreferences } from "./types";

/** Tiny class-name joiner — avoids pulling in a dependency. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function formatPrice(value: number): string {
  return `₹${value}`;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Captured once at module load instead of on every render, so formatting stays
 * pure and deterministic during prerender (Cache Components flags clocks in
 * the render path).
 */
const CURRENT_YEAR = new Date().getFullYear();

/** "2026-09-24" -> "September 24" (adds the year when it is not the current one). */
export function formatVisitDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  const label = `${MONTHS[month - 1]} ${day}`;
  return year === CURRENT_YEAR ? label : `${label}, ${year}`;
}

export function todayIso(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function greetingFor(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function capitalize(value: string): string {
  return value.length ? value[0].toUpperCase() + value.slice(1) : value;
}

const SWEETNESS_LABEL = [
  "",
  "barely sweet",
  "lightly sweet",
  "moderately sweet",
  "fairly sweet",
  "very sweet",
];

const BITTERNESS_LABEL = [
  "",
  "very mild",
  "mild",
  "medium-bodied",
  "bold",
  "very bold",
];

/** Human-readable summary of a taste profile, used in explanation copy. */
export function describePreferences(preferences: TastePreferences): string {
  const temperature = preferences.temperature === "both" ? "hot or cold" : preferences.temperature;
  const ingredient = preferences.temperature === "hot" ? "coffee" : "coffee";
  return `${temperature} ${SWEETNESS_LABEL[preferences.sweetness] ?? "balanced"} ${ingredient}`;
}

export function describeBody(preferences: TastePreferences): string {
  return BITTERNESS_LABEL[preferences.bitterness] ?? "medium-bodied";
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural ?? `${singular}s`;
}
