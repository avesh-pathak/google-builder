import "server-only";

import { CAFES, MENU, PRIMARY_CAFE_ID, USERS, VISITS } from "@/lib/data";
import { getSupabase } from "./supabase";

const TABLES = ["users", "cafes", "menu_items", "friendships", "visits", "visit_items", "user_favorites", "item_ratings"] as const;
export interface SeedCounts {
  users: number; cafes: number; menu_items: number; friendships: number;
  visits: number; visit_items: number; favorites: number; item_ratings: number;
}
export async function countRows(): Promise<SeedCounts> {
  const db = getSupabase();
  const counts = await Promise.all(TABLES.map(async table => {
    const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
    if (error) throw error;
    return count ?? 0;
  }));
  const [users, cafes, menu_items, friendships, visits, visit_items, favorites, item_ratings] = counts;
  return { users, cafes, menu_items, friendships, visits, visit_items, favorites, item_ratings };
}

/** Dependency-ordered, retry-safe seeding. Each batch is atomic, not the whole seed.
 * Existing rows are never overwritten. A failed batch can safely be retried.
 */
export async function seedDemoData(): Promise<SeedCounts> {
  const db = getSupabase();
  async function insert(table: string, rows: Record<string, unknown>[], onConflict: string) {
    if (!rows.length) return;
    const { error } = await db.from(table).upsert(rows, { onConflict, ignoreDuplicates: true });
    if (error) throw error;
  }
  await insert("users", USERS.map(user => ({
    id: user.id, name: user.name, initials: user.initials, color: user.color, bio: user.bio,
    sweetness: user.preferences.sweetness, bitterness: user.preferences.bitterness,
    temperature: user.preferences.temperature, favorite_flavors: user.preferences.favoriteFlavors,
    disliked_ingredients: user.preferences.dislikedIngredients, budget: user.preferences.budget,
    usual_order_id: user.usualOrderId, usual_note: user.usualNote,
  })), "id");
  await insert("cafes", CAFES.map(cafe => ({
    id: cafe.id, name: cafe.name, location: cafe.area, description: cafe.blurb, image: cafe.image,
  })), "id");
  await insert("menu_items", MENU.map(item => ({
    id: item.id, cafe_id: PRIMARY_CAFE_ID, name: item.name, description: item.description,
    category: item.category, price: item.price, image: item.image, taste_tags: item.tags, available: true,
  })), "id");
  const edges = new Map<string, Record<string, unknown>>();
  for (const user of USERS) for (const friend of user.friendIds) {
    edges.set(`${user.id}:${friend}`, { user_id: user.id, friend_id: friend });
    edges.set(`${friend}:${user.id}`, { user_id: friend, friend_id: user.id });
  }
  await insert("friendships", [...edges.values()], "user_id,friend_id");
  await insert("visits", VISITS.map(visit => ({
    id: visit.id, user_id: visit.userId, cafe_id: visit.cafeId,
    cafe_name: CAFES.find(cafe => cafe.id === visit.cafeId)?.name ?? "",
    visited_at: visit.date, notes: visit.note ?? null, shared_with_friends: visit.shared, source: "seed",
  })), "id");
  await insert("visit_items", VISITS.flatMap(visit => visit.items.map((item, index) => ({
    id: `${visit.id}-item-${index}`, visit_id: visit.id, menu_item_id: item.menuItemId ?? null,
    item_name: item.name, rating: item.rating,
  }))), "id");
  await insert("user_favorites", USERS.map(user => ({
    user_id: user.id, menu_item_id: user.usualOrderId,
  })), "user_id,menu_item_id");
  return countRows();
}

/** The reset RPC is service-role-only and is only exposed by the development route. */
export async function resetDemoData(): Promise<SeedCounts> {
  const { error } = await getSupabase().rpc("app_reset_demo_data");
  if (error) throw error;
  return seedDemoData();
}
