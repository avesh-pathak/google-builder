import { TASTE_TAGS } from "./data";
import type { Cafe, MenuItem, Tasting, User, Visit } from "./types";
import { capitalize, describePreferences } from "./utils";

/**
 * Deterministic recommender.
 *
 * Phase 1 rules in, explanations out. Every suggestion is traceable to a
 * stored rating or a shared friend visit — there are no invented "AI match
 * percentages" anywhere. When the Gemini call lands in Phase 3 it replaces
 * `reason` strings, not the shape of these results.
 */

export interface RecommenderInput {
  user: User;
  users: User[];
  cafes: Cafe[];
  menu: MenuItem[];
  visits: Visit[];
  tastings: Tasting[];
  primaryCafeId: string;
}

export interface FriendSignal {
  friend: User;
  rating: number;
  cafeId: string;
  visit: Visit;
}

export interface Recommendation {
  item: MenuItem;
  cafeId: string;
  score: number;
  kind: "friend" | "taste";
  reason: string;
  friend?: { id: string; name: string; initials: string; color: string; rating: number };
}

export interface FriendFavourite {
  friend: User;
  item: MenuItem;
  rating: number;
  cafeId: string;
}

export interface TasteSimilarity {
  score: number;
  label: string;
  detail: string;
}

/**
 * ISO dates sort lexicographically, so "most recent first" needs no clock at
 * all — which also keeps render output deterministic for prerendering.
 */
function byDateDesc(a: string, b: string): number {
  return b.localeCompare(a);
}

/* ---------------------------------------------------------------- helpers */

export function menuItemById(menu: MenuItem[], id?: string): MenuItem | undefined {
  if (!id) return undefined;
  return menu.find((item) => item.id === id);
}

/** Items the user has already had a coffee date with. */
export function triedItemIds(input: RecommenderInput): Set<string> {
  const ids = new Set<string>();
  for (const visit of input.visits) {
    if (visit.userId !== input.user.id) continue;
    for (const line of visit.items) if (line.menuItemId) ids.add(line.menuItemId);
  }
  for (const tasting of input.tastings) {
    if (tasting.userId === input.user.id) ids.add(tasting.menuItemId);
  }
  return ids;
}

/** Best known rating for an item, checking explicit tastings first. */
export function ratingForItem(input: RecommenderInput, itemId: string): number | undefined {
  const tasting = input.tastings.find(
    (t) => t.userId === input.user.id && t.menuItemId === itemId,
  );
  if (tasting) return tasting.rating;

  let best: number | undefined;
  for (const visit of input.visits) {
    if (visit.userId !== input.user.id) continue;
    for (const line of visit.items) {
      if (line.menuItemId !== itemId) continue;
      best = best === undefined ? line.rating : Math.max(best, line.rating);
    }
  }
  return best;
}

/** Taste-match score derived purely from the stored preference profile. */
function preferenceScore(user: User, item: MenuItem): number {
  const { preferences } = user;
  let score = 0;

  if (preferences.temperature === "cold" && item.tags.includes("cold")) score += 2;
  if (preferences.temperature === "hot" && item.tags.includes("hot")) score += 2;
  if (
    preferences.temperature === "both" &&
    (item.tags.includes("cold") || item.tags.includes("hot"))
  ) {
    score += 1;
  }

  if (preferences.sweetness >= 4 && item.tags.includes("sweet")) score += 2;
  if (preferences.sweetness === 3 && item.tags.includes("sweet")) score += 1;
  if (
    preferences.sweetness <= 2 &&
    (item.tags.includes("bitter") || item.tags.includes("strong"))
  ) {
    score += 2;
  }

  if (preferences.bitterness >= 4 && item.tags.includes("bitter")) score += 2;
  if (preferences.bitterness >= 4 && item.tags.includes("strong")) score += 1;
  if (preferences.bitterness <= 2 && item.tags.includes("creamy")) score += 1;

  for (const flavor of preferences.favoriteFlavors) {
    const needle = flavor.toLowerCase();
    for (const tag of item.tags) {
      if (needle.includes(tag)) score += 1;
    }
  }

  return score;
}

/**
 * Items that mention an ingredient the user avoids are never suggested.
 * A simple, honest substring check against the item's name, description and
 * taste tags — no hidden scoring.
 */
function isDisliked(user: User, item: MenuItem): boolean {
  const disliked = user.preferences.dislikedIngredients ?? [];
  if (disliked.length === 0) return false;
  const haystack = `${item.name} ${item.description} ${item.tags.join(" ")}`.toLowerCase();
  return disliked.some((ingredient) => {
    const needle = ingredient.trim().toLowerCase();
    return needle.length > 1 && haystack.includes(needle);
  });
}

/**
 * Friends only ever expose visits they marked as shared. Secret visits stay
 * secret, even between friends.
 */
export function friendSignals(input: RecommenderInput): Map<string, FriendSignal[]> {
  const byItem = new Map<string, FriendSignal[]>();
  const friends = new Set(input.user.friendIds);

  for (const visit of input.visits) {
    if (visit.userId === input.user.id) continue;
    if (!visit.shared) continue;
    if (!friends.has(visit.userId)) continue;

    const friend = input.users.find((u) => u.id === visit.userId);
    if (!friend) continue;

    for (const line of visit.items) {
      if (!line.menuItemId || line.rating < 4) continue;
      const list = byItem.get(line.menuItemId) ?? [];
      list.push({ friend, rating: line.rating, cafeId: visit.cafeId, visit });
      byItem.set(line.menuItemId, list);
    }
  }

  for (const list of byItem.values()) {
    list.sort((a, b) => b.rating - a.rating || byDateDesc(a.visit.date, b.visit.date));
  }
  return byItem;
}

function tasteWords(user: User, friend: User, item: MenuItem): string[] {
  const words: string[] = [];
  const a = user.preferences;
  const b = friend.preferences;

  if (a.sweetness >= 3 && b.sweetness >= 3 && item.tags.includes("sweet")) words.push("sweet");
  if (
    a.bitterness >= 4 &&
    b.bitterness >= 4 &&
    (item.tags.includes("bitter") || item.tags.includes("strong"))
  ) {
    words.push("strong");
  }
  if (
    a.temperature === b.temperature &&
    a.temperature !== "both" &&
    item.tags.includes(a.temperature)
  ) {
    words.push(a.temperature);
  }
  for (const tag of item.tags) {
    if (words.includes(tag)) continue;
    const shared = [a, b].every((prefs) =>
      prefs.favoriteFlavors.some((flavor) => flavor.toLowerCase().includes(tag)),
    );
    if (shared) words.push(tag);
  }
  return words.slice(0, 3);
}

function nounFor(item: MenuItem): string {
  return item.category === "drinks" ? "coffee" : "food";
}

export function friendReason(
  input: RecommenderInput,
  item: MenuItem,
  signal: FriendSignal,
  cafeName: string,
): string {
  const words = tasteWords(input.user, signal.friend, item);
  const drinkWord = item.category === "drinks" ? "drink" : "dish";
  if (words.length) {
    return `${signal.friend.name} loved this ${drinkWord}. You both enjoy ${words.join(", ")} ${nounFor(item)}.`;
  }
  return `${signal.friend.name} rated this ${signal.rating}/5 at ${cafeName}, and it fits your profile.`;
}

function tasteReason(user: User, item: MenuItem): string {
  const tags = item.tags.slice(0, 3).join(", ");
  return `New to you. ${capitalize(tags)} — it lines up with your taste for ${describePreferences(user.preferences)}.`;
}

/* ---------------------------------------------------------- entry points */

/** Untried items a friend already rated 4+. Ordered by friend score. */
export function getFriendRecommendations(input: RecommenderInput, limit = 3): Recommendation[] {
  const tried = triedItemIds(input);
  const signals = friendSignals(input);
  const results: Recommendation[] = [];

  for (const [itemId, list] of signals) {
    if (tried.has(itemId)) continue;
    const item = menuItemById(input.menu, itemId);
    if (!item) continue;
    if (isDisliked(input.user, item)) continue;

    const best = list[0];
    const cafeName = cafeNameFor(input, best.cafeId);

    results.push({
      item,
      cafeId: best.cafeId,
      score: preferenceScore(input.user, item) + best.rating * 3 + list.length,
      kind: "friend",
      reason: friendReason(input, item, best, cafeName),
      friend: {
        id: best.friend.id,
        name: best.friend.name,
        initials: best.friend.initials,
        color: best.friend.color,
        rating: best.rating,
      },
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

/** Untried items with no friend signal, ranked by the stored taste profile. */
export function getTasteDiscoveries(
  input: RecommenderInput,
  excludeItemIds: string[],
  limit = 4,
): Recommendation[] {
  const tried = triedItemIds(input);
  const excluded = new Set(excludeItemIds);

  return input.menu
    .filter(
      (item) => !tried.has(item.id) && !excluded.has(item.id) && !isDisliked(input.user, item),
    )
    .map<Recommendation>((item) => ({
      item,
      cafeId: input.primaryCafeId,
      score: preferenceScore(input.user, item),
      kind: "taste",
      reason: tasteReason(input.user, item),
    }))
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit);
}

/** One or two standout shared items per friend. */
export function getFriendsFavourites(input: RecommenderInput, perFriend = 2): FriendFavourite[] {
  const results: FriendFavourite[] = [];

  for (const friendId of input.user.friendIds) {
    const friend = input.users.find((u) => u.id === friendId);
    if (!friend) continue;

    const candidates = new Map<string, { rating: number; cafeId: string; date: string }>();
    for (const visit of input.visits) {
      if (visit.userId !== friendId || !visit.shared) continue;
      for (const line of visit.items) {
        if (!line.menuItemId || line.rating < 4) continue;
        const existing = candidates.get(line.menuItemId);
        if (!existing || line.rating > existing.rating) {
          candidates.set(line.menuItemId, {
            rating: line.rating,
            cafeId: visit.cafeId,
            date: visit.date,
          });
        }
      }
    }

    const ranked = [...candidates.entries()]
      .sort((a, b) => b[1].rating - a[1].rating || byDateDesc(a[1].date, b[1].date))
      .slice(0, perFriend);

    for (const [itemId, meta] of ranked) {
      const item = menuItemById(input.menu, itemId);
      if (!item) continue;
      results.push({ friend, item, rating: meta.rating, cafeId: meta.cafeId });
    }
  }

  return results;
}

export interface UsualOrder {
  item: MenuItem;
  note: string;
  cafeId: string;
  lastVisit?: Visit;
}

export function getUsualOrder(input: RecommenderInput): UsualOrder | undefined {
  const item = menuItemById(input.menu, input.user.usualOrderId);
  if (!item) return undefined;

  const lastVisit = input.visits
    .filter((v) => v.userId === input.user.id)
    .sort((a, b) => byDateDesc(a.date, b.date))[0];

  return {
    item,
    note: input.user.usualNote,
    cafeId: lastVisit?.cafeId ?? input.primaryCafeId,
    lastVisit,
  };
}

/* ------------------------------------------------------------- friends */

export function getTasteSimilarity(
  a: User,
  b: User,
  visits: Visit[],
  menu: MenuItem[],
): TasteSimilarity {
  const pa = a.preferences;
  const pb = b.preferences;

  let score = 0;
  score += (5 - Math.abs(pa.sweetness - pb.sweetness)) * 8;
  score += (5 - Math.abs(pa.bitterness - pb.bitterness)) * 5;
  if (pa.temperature === pb.temperature) score += 15;
  else if (pa.temperature === "both" || pb.temperature === "both") score += 8;

  const label =
    score >= 65
      ? "Very similar tastes"
      : score >= 50
        ? "Similar tastes"
        : score >= 30
          ? "Some tastes in common"
          : "Different tastes";

  // Evidence first: items both people rated 4 or higher.
  const highFor = (userId: string) => {
    const ids = new Set<string>();
    for (const visit of visits) {
      if (visit.userId !== userId) continue;
      for (const line of visit.items) {
        if (line.menuItemId && line.rating >= 4) ids.add(line.menuItemId);
      }
    }
    return ids;
  };

  const aHigh = highFor(a.id);
  const bHigh = highFor(b.id);
  const shared = [...aHigh].filter((id) => bHigh.has(id));
  let detail: string;

  if (shared.length) {
    const names = shared
      .map((id) => menu.find((item) => item.id === id)?.name)
      .filter(Boolean)
      .slice(0, 2)
      .join(" and ");
    detail = `You both rated ${names} highly.`;
  } else {
    const words: string[] = [];
    if (pa.sweetness >= 3 && pb.sweetness >= 3) words.push("sweet");
    if (pa.bitterness >= 4 && pb.bitterness >= 4) words.push("strong");
    if (pa.temperature === pb.temperature && pa.temperature !== "both") {
      words.push(pa.temperature);
    }
    detail = words.length
      ? `Both of you lean towards ${words.slice(0, 2).join(", ")} coffee.`
      : "Few overlapping favourites — you two order quite differently.";
  }

  return { score, label, detail };
}

export interface FriendView {
  friend: User;
  similarity: TasteSimilarity;
  sharedVisits: Visit[];
  recommended: { item: MenuItem; rating: number; cafeId: string }[];
  privateVisitCount: number;
}

/** Everything the viewer is allowed to see about a friend. */
export function getFriendView(input: RecommenderInput, friendId: string): FriendView | undefined {
  const friend = input.users.find((u) => u.id === friendId);
  if (!friend) return undefined;

  const mine = input.visits.filter((v) => v.userId === friendId);
  const sharedVisits = mine
    .filter((v) => v.shared)
    .sort((a, b) => byDateDesc(a.date, b.date));

  const rated = new Map<string, { rating: number; cafeId: string }>();
  for (const visit of sharedVisits) {
    for (const line of visit.items) {
      if (!line.menuItemId || line.rating < 4) continue;
      const existing = rated.get(line.menuItemId);
      if (!existing || line.rating > existing.rating) {
        rated.set(line.menuItemId, { rating: line.rating, cafeId: visit.cafeId });
      }
    }
  }

  const recommended = [...rated.entries()]
    .map(([id, meta]) => ({ item: menuItemById(input.menu, id), ...meta }))
    .filter((entry): entry is { item: MenuItem; rating: number; cafeId: string } => Boolean(entry.item))
    .sort((a, b) => b.rating - a.rating || a.item.name.localeCompare(b.item.name));

  return {
    friend,
    similarity: getTasteSimilarity(input.user, friend, input.visits, input.menu),
    sharedVisits,
    recommended,
    privateVisitCount: mine.length - sharedVisits.length,
  };
}

export function cafeNameFor(input: RecommenderInput, cafeId: string): string {
  return input.cafes.find((c) => c.id === cafeId)?.name ?? "Café Circle";
}

/* ------------------------------------------------------------ favourites */

export function favouriteItems(input: RecommenderInput, favouriteIds: string[]): MenuItem[] {
  return favouriteIds
    .map((id) => menuItemById(input.menu, id))
    .filter((item): item is MenuItem => Boolean(item));
}

export function tagLabel(tagId: string): string {
  return TASTE_TAGS.find((tag) => tag.id === tagId)?.label ?? capitalize(tagId);
}
