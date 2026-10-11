import { loadEnvFile } from "node:process";
import { createClient } from "@supabase/supabase-js";
import { getBootstrapSnapshot, getFriendActivity, getVisitsForUser } from "@/lib/server/repositories";
import { getSupabase } from "@/lib/server/supabase";

/** Read-only integration checks. Do not print profile details or credentials. */
async function main() {
  loadEnvFile(".env");
  const snapshot = await getBootstrapSnapshot();
  if (!snapshot.users.length || !snapshot.menu.length) throw new Error("Demo data is missing; run npm run db:seed.");
  for (const user of snapshot.users) {
    const visits = await getVisitsForUser(user.id);
    if (visits.some(visit => visit.userId !== user.id)) throw new Error("Visit ownership filter failed.");
    const activity = await getFriendActivity(user.id);
    if (activity.sharedVisits.some(visit => !visit.shared || !activity.friendIds.includes(visit.userId))) {
      throw new Error("Friend activity privacy filter failed.");
    }
  }
  console.log(`API reads verified: ${snapshot.users.length} users, ${snapshot.menu.length} menu items, ${snapshot.visits.length} visits. Ownership/shared filters passed.`);

  const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!publicKey) throw new Error("Missing publishable key for anonymous access checks.");
  const publicClient = createClient(process.env.SUPABASE_URL!, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (const table of ["users", "cafes", "menu_items", "friendships", "visits", "visit_items", "user_favorites", "item_ratings"]) {
    const { data, error } = await publicClient.from(table).select("*").limit(1);
    if (!error && data?.length) throw new Error(`Anonymous access is unexpectedly allowed for ${table}.`);
  }
  console.log("Publishable-key checks passed: app rows are not exposed to anonymous clients.");

  const { data, error } = await getSupabase().rpc("app_api_status");
  if (error || data !== "supabase-api-v1") {
    throw new Error("Apply supabase/migrations/20261011065347_supabase_api.sql in Supabase SQL Editor. New visit RPC is not ready yet.");
  }
  const publicStatus = await publicClient.rpc("app_api_status");
  if (!publicStatus.error) throw new Error("Anonymous callers must not execute the server-only API probe.");
  console.log("Server-only API migration verified.");
}
main().catch(error => {
  // Never log raw network errors or headers containing API keys.
  console.error(error instanceof Error ? error.message : "Supabase API check failed.");
  process.exitCode = 1;
});
