import "server-only";

import { createClient } from "@supabase/supabase-js";

/** Privileged Data API access. Never import this module into a client component. */
export function getSupabase() {
  const url = process.env.SUPABASE_URL?.trim();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !secret) {
    throw Object.assign(new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env."), {
      code: "SUPABASE_NOT_CONFIGURED",
    });
  }
  // No public-key fallback: RLS deliberately denies anonymous access to demo data.
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, {
        ...init, cache: "no-store", signal: init?.signal ?? AbortSignal.timeout(15_000),
      }),
    },
  });
}

export async function healthCheck(): Promise<{ now: string }> {
  const { error } = await getSupabase().from("users").select("id").limit(1);
  if (error) throw error;
  return { now: new Date().toISOString() };
}
