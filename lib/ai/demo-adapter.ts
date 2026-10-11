import { CAFES, MENU, PRIMARY_CAFE_ID, USERS, VISITS } from "@/lib/data";
import { getFriendRecommendations, getTasteDiscoveries } from "@/lib/recommender";
import type { MenuItem, User } from "@/lib/types";
import type { AIContext, AIMenuItem } from "./types";

export const DEMO_AI_MENU: AIMenuItem[] = MENU.map((m) => ({ id: m.id, name: m.name, category: m.category === "drinks" ? "drink" : "food", priceINR: m.price, description: m.description, tags: m.tags as AIMenuItem["tags"], ingredients: [], source: "application_menu" }));

/** Removable Phase 1 adapter. No persistence, queries, second scorer, or private friend records. */
export function demoContext(menu: AIMenuItem[], userId = USERS[0].id, budgetINR: number | null = null): AIContext {
  const user = USERS.find((u) => u.id === userId) ?? USERS[0];
  const rankingMenu: MenuItem[] = menu.filter((m) => m.category !== "unknown").map((m) => ({
    id: m.id, name: m.name, category: m.category === "drink" ? "drinks" : "food", price: m.priceINR ?? 0,
    description: [m.description, ...m.ingredients].filter(Boolean).join(" "), tags: m.tags, image: "",
  }));
  const input = { user, users: USERS, cafes: CAFES, menu: rankingMenu, visits: VISITS, tastings: [], primaryCafeId: PRIMARY_CAFE_ID };
  const friends = getFriendRecommendations(input, 6);
  const ranked = [...friends, ...getTasteDiscoveries(input, friends.map((r) => r.item.id), 6)];
  const prefs = (u: User) => ({ sweetness: u.preferences.sweetness, bitterness: u.preferences.bitterness, temperature: u.preferences.temperature, favoriteFlavors: u.preferences.favoriteFlavors });
  const records = (ownerId: string, sharedOnly: boolean) => VISITS.filter((v) => v.userId === ownerId && (!sharedOnly || v.shared)).flatMap((v) => v.items.map((m, i) => ({
    id: `${v.id}-${i}`, itemId: m.menuItemId ?? null, itemName: m.name, rating: m.rating,
    cafeName: CAFES.find((c) => c.id === v.cafeId)?.name ?? "Unknown café", note: v.note?.slice(0, 300) ?? null,
  }))).slice(0, 20);
  return {
    user: { id: user.id, preferences: prefs(user), dislikedIngredients: user.preferences.dislikedIngredients, dietaryRestrictions: [], budgetINR },
    memory: records(user.id, false),
    friends: USERS.filter((u) => user.friendIds.includes(u.id)).map((u) => ({ id: u.id, name: u.name, preferences: prefs(u), sharedRecommendations: records(u.id, true).slice(0, 10).map((r) => ({ ...r, shared: true })) })),
    menu, rankedCandidates: ranked.slice(0, 12).map((r, i) => ({ itemId: r.item.id, rank: i + 1, evidence: [r.reason] })),
  };
}
