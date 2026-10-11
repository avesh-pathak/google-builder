import "server-only";

import type { Cafe, MenuItem, TastePreferences, Tasting, User, Visit } from "@/lib/types";
import { getSupabase } from "./supabase";
import { rowToCafe, rowToMenuItem, rowToTasting, rowToUser, rowToVisit, rowToVisitItem } from "./serialize";

type Row = Record<string, unknown>;
export interface BootstrapSnapshot {
  users: User[];
  cafes: Cafe[];
  menu: MenuItem[];
  visits: Visit[];
  tastings: Tasting[];
  favorites: Record<string, string[]>;
}

const VISIT_SELECT = "*,visit_items(id,menu_item_id,item_name,rating)";
function toVisit(row: Row): Visit {
  const items = Array.isArray(row.visit_items) ? row.visit_items as Row[] : [];
  items.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return rowToVisit(row, items.map(rowToVisitItem));
}
function codedError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

/** Demo profile switching intentionally loads all demo users, including their own private history.
 * This is not an authenticated multi-user product; do not deploy it with real user data.
 */
export async function getBootstrapSnapshot(): Promise<BootstrapSnapshot> {
  const db = getSupabase();
  const results = await Promise.all([
    db.from("users").select("*").order("id"),
    db.from("cafes").select("*").order("id"),
    db.from("menu_items").select("*").eq("available", true).order("id"),
    db.from("visits").select(VISIT_SELECT).order("visited_at", { ascending: false }).order("id"),
    db.from("item_ratings").select("*").order("user_id").order("menu_item_id"),
    db.from("user_favorites").select("user_id,menu_item_id").order("user_id").order("menu_item_id"),
    db.from("friendships").select("user_id,friend_id").order("friend_id"),
  ]);
  for (const result of results) if (result.error) throw result.error;
  const [users, cafes, menu, visits, ratings, favoriteRows, friendships] = results.map(r => r.data ?? []);
  const friends: Record<string, string[]> = {};
  const favorites: Record<string, string[]> = {};
  for (const row of friendships) (friends[String(row.user_id)] ??= []).push(String(row.friend_id));
  for (const row of favoriteRows) (favorites[String(row.user_id)] ??= []).push(String(row.menu_item_id));
  return {
    users: users.map(row => rowToUser(row, friends[String(row.id)] ?? [])),
    cafes: cafes.map(rowToCafe), menu: menu.map(rowToMenuItem),
    visits: visits.map(toVisit), tastings: ratings.map(rowToTasting), favorites,
  };
}

export async function getUser(userId: string): Promise<User | null> {
  const db = getSupabase();
  const { data, error } = await db.from("users").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const friends = await db.from("friendships").select("friend_id").eq("user_id", userId).order("friend_id");
  if (friends.error) throw friends.error;
  return rowToUser(data, (friends.data ?? []).map(row => String(row.friend_id)));
}

export async function getVisitsForUser(userId: string): Promise<Visit[]> {
  const { data, error } = await getSupabase().from("visits").select(VISIT_SELECT)
    .eq("user_id", userId).order("visited_at", { ascending: false }).order("id");
  if (error) throw error;
  return (data ?? []).map(toVisit);
}

const PREFERENCE_COLUMNS: Record<keyof TastePreferences, string> = {
  sweetness: "sweetness", bitterness: "bitterness", temperature: "temperature",
  favoriteFlavors: "favorite_flavors", dislikedIngredients: "disliked_ingredients", budget: "budget",
};
export async function updateUserPreferences(userId: string, patch: Partial<TastePreferences>): Promise<User | null> {
  const values: Row = {};
  for (const key of Object.keys(PREFERENCE_COLUMNS) as (keyof TastePreferences)[]) {
    if (patch[key] !== undefined) values[PREFERENCE_COLUMNS[key]] = patch[key];
  }
  if (Object.keys(values).length) {
    const { error } = await getSupabase().from("users").update(values).eq("id", userId);
    if (error) throw error;
  }
  return getUser(userId);
}

export async function createVisit(input: {
  userId: string; cafeName: string; visitedAt: string; note?: string | null; shared: boolean;
  items: { menuItemId?: string | null; itemName: string; rating: number }[];
}): Promise<Visit> {
  if (!await getUser(input.userId)) throw codedError("USER_NOT_FOUND", "User not found");
  // One RPC = one Postgres transaction. Never split parent and child writes into HTTP calls.
  const { data, error } = await getSupabase().rpc("app_create_visit", { payload: input });
  if (error) throw error;
  if (!data) throw new Error("Visit could not be saved");
  return toVisit(data as Row);
}

async function requireMenuItem(menuItemId: string): Promise<void> {
  const { data, error } = await getSupabase().from("menu_items").select("id").eq("id", menuItemId).maybeSingle();
  if (error) throw error;
  if (!data) throw codedError("ITEM_NOT_FOUND", "Menu item not found");
}
export async function upsertItemRating(userId: string, menuItemId: string, rating: number): Promise<Tasting> {
  await requireMenuItem(menuItemId);
  const { data, error } = await getSupabase().from("item_ratings").upsert({
    user_id: userId, menu_item_id: menuItemId, rating, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,menu_item_id" }).select("*").single();
  if (error) throw error;
  return rowToTasting({ ...data, updated_at: String(data.updated_at).slice(0, 10) });
}
export async function addFavorite(userId: string, menuItemId: string): Promise<void> {
  await requireMenuItem(menuItemId);
  const { error } = await getSupabase().from("user_favorites").upsert({
    user_id: userId, menu_item_id: menuItemId,
  }, { onConflict: "user_id,menu_item_id", ignoreDuplicates: true });
  if (error) throw error;
}
export async function removeFavorite(userId: string, menuItemId: string): Promise<void> {
  const { error } = await getSupabase().from("user_favorites").delete().eq("user_id", userId).eq("menu_item_id", menuItemId);
  if (error) throw error;
}

/** Service-role bypasses RLS; friend-facing reads must always enforce both filters. */
export async function getFriendActivity(userId: string): Promise<{ friendIds: string[]; sharedVisits: Visit[] }> {
  const db = getSupabase();
  const friends = await db.from("friendships").select("friend_id").eq("user_id", userId).order("friend_id");
  if (friends.error) throw friends.error;
  const friendIds = (friends.data ?? []).map(row => String(row.friend_id));
  if (!friendIds.length) return { friendIds, sharedVisits: [] };
  const { data, error } = await db.from("visits").select(VISIT_SELECT).eq("shared_with_friends", true)
    .in("user_id", friendIds).order("visited_at", { ascending: false }).order("id");
  if (error) throw error;
  return { friendIds, sharedVisits: (data ?? []).map(toVisit) };
}
