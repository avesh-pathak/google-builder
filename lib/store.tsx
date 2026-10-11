"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PRIMARY_CAFE_ID } from "./data";
import type { RecommenderInput } from "./recommender";
import type { Cafe, MenuItem, Tasting, TastePreferences, User, Visit } from "./types";
import { todayIso } from "./utils";

/**
 * Phase 2 data layer.
 *
 * The public shape of `useApp()` is unchanged from Phase 1, so no component
 * needed rewriting. What changed is where the data comes from:
 *
 *   Phase 1: seed data in `lib/data.ts` persisted to localStorage.
 *   Phase 2: Supabase Postgres, read and written through `/api/*` routes.
 *
 * localStorage is now only used for one harmless setting — which demo profile
 * is selected. No business records live there.
 */

const ACTIVE_USER_KEY = "cafe-circle-ai:activeUser";

export type AppStatus = "loading" | "ready" | "error";

export interface NewVisitInput {
  cafeName: string;
  date: string;
  itemName: string;
  menuItemId?: string;
  rating: number;
  note: string;
  shared: boolean;
}

interface BootstrapPayload {
  users: User[];
  cafes: Cafe[];
  menu: MenuItem[];
  visits: Visit[];
  tastings: Tasting[];
  favorites: Record<string, string[]>;
}

interface AppContextValue {
  status: AppStatus;
  /** Set when the initial load fails. Safe, user-facing copy. */
  error: string | null;
  /** Set when a write fails. Cleared by `dismissMutationError`. */
  mutationError: string | null;
  dismissMutationError: () => void;
  reload: () => void;

  users: User[];
  cafes: Cafe[];
  menu: MenuItem[];
  visits: Visit[];
  tastings: Tasting[];
  user: User;
  recommenderInput: RecommenderInput;

  setActiveUser: (userId: string) => void;
  addVisit: (input: NewVisitInput) => void;
  rateItem: (menuItemId: string, rating: number) => void;
  toggleFavorite: (menuItemId: string) => void;
  isFavorite: (menuItemId: string) => boolean;
  favouriteIds: string[];
  updatePreferences: (patch: Partial<TastePreferences>) => void;
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

/**
 * Stand-in used only while the first load is in flight (the shell shows a
 * loading state instead of the app, so this is never rendered).
 */
const PENDING_USER: User = {
  id: "pending",
  name: "there",
  initials: "··",
  color: "#a45f2c",
  bio: "",
  preferences: {
    sweetness: 3,
    bitterness: 3,
    temperature: "both",
    favoriteFlavors: [],
    dislikedIngredients: [],
    budget: "balanced",
  },
  usualOrderId: "",
  usualNote: "",
  friendIds: [],
};

const EMPTY_DATA: BootstrapPayload = {
  users: [],
  cafes: [],
  menu: [],
  visits: [],
  tastings: [],
  favorites: {},
};

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    cache: "no-store",
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body?.error?.message) message = body.error.message;
    } catch {
      // Non-JSON error body — keep the status-based message.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

/** Newest visit first, matching what the backend returns. */
function sortVisits(visits: Visit[]): Visit[] {
  return [...visits].sort((a, b) => b.date.localeCompare(a.date));
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<BootstrapPayload>(EMPTY_DATA);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<AppStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Remember the chosen demo profile across reloads. This is a preference, not
  // a business record, so localStorage is the right home for it.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ACTIVE_USER_KEY);
      if (stored) setActiveUserId(stored);
    } catch {
      // Storage unavailable — fall back to the first user.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);

    void (async () => {
      try {
        const payload = await fetchJson<BootstrapPayload>("/api/bootstrap");
        if (cancelled) return;
        setData({
          users: payload.users ?? [],
          cafes: payload.cafes ?? [],
          menu: payload.menu ?? [],
          visits: sortVisits(payload.visits ?? []),
          tastings: payload.tastings ?? [],
          favorites: payload.favorites ?? {},
        });
        setStatus("ready");
      } catch (loadError) {
        if (cancelled) return;
        console.error("[cafe-circle] bootstrap failed", loadError);
        setError("We couldn't load your café data. Please try again.");
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  const user = useMemo(
    () =>
      data.users.find((candidate) => candidate.id === activeUserId) ??
      data.users[0] ??
      PENDING_USER,
    [data.users, activeUserId],
  );

  const favouriteIds = useMemo(
    () => data.favorites[user.id] ?? [],
    [data.favorites, user.id],
  );

  const setActiveUser = useCallback((userId: string) => {
    setActiveUserId(userId);
    try {
      window.localStorage.setItem(ACTIVE_USER_KEY, userId);
    } catch {
      // Non-critical.
    }
  }, []);

  /**
   * Fire-and-forget write with a shared failure message.
   * Returns false when the write failed, so callers can roll back optimistic state.
   */
  const mutate = useCallback(
    async (run: () => Promise<void>, failureMessage: string): Promise<boolean> => {
      try {
        await run();
        return true;
      } catch (mutationFailure) {
        console.error("[cafe-circle] mutation failed", mutationFailure);
        setMutationError(failureMessage);
        return false;
      }
    },
    [],
  );

  const dismissMutationError = useCallback(() => setMutationError(null), []);

  const addVisit = useCallback(
    (input: NewVisitInput) => {
      const userId = user.id;
      void mutate(async () => {
        const visit = await fetchJson<Visit>("/api/visits", {
          method: "POST",
          body: JSON.stringify({
            userId,
            cafeName: input.cafeName,
            visitedAt: input.date || todayIso(),
            note: input.note || null,
            shared: input.shared,
            items: [
              {
                menuItemId: input.menuItemId ?? null,
                itemName: input.itemName,
                rating: input.rating,
              },
            ],
          }),
        });

        setData((current) => {
          // The backend may have created a café for an unknown name; refresh
          // the café list lazily on the next bootstrap if a name is missing.
          const hasCafe = current.cafes.some((cafe) => cafe.id === visit.cafeId);
          return {
            ...current,
            visits: sortVisits([visit, ...current.visits]),
            cafes: hasCafe
              ? current.cafes
              : [
                  ...current.cafes,
                  {
                    id: visit.cafeId,
                    name: input.cafeName,
                    area: "Added by you",
                    blurb: "",
                    image: current.cafes[0]?.image ?? "",
                  },
                ],
          };
        });
      }, "Couldn't save your visit. Please try again.");
    },
    [mutate, user.id],
  );

  const rateItem = useCallback(
    (menuItemId: string, rating: number) => {
      const userId = user.id;
      const previous = data.tastings;

      // Optimistic: the star row updates on the current frame.
      setData((current) => ({
        ...current,
        tastings: [
          ...current.tastings.filter(
            (entry) => !(entry.userId === userId && entry.menuItemId === menuItemId),
          ),
          {
            id: `${userId}:${menuItemId}`,
            userId,
            menuItemId,
            rating,
            date: todayIso(),
          },
        ],
      }));

      void mutate(async () => {
        const tasting = await fetchJson<Tasting>(
          `/api/users/${encodeURIComponent(userId)}/ratings/${encodeURIComponent(menuItemId)}`,
          { method: "PUT", body: JSON.stringify({ rating }) },
        );
        setData((current) => ({
          ...current,
          tastings: [
            ...current.tastings.filter(
              (entry) => !(entry.userId === userId && entry.menuItemId === menuItemId),
            ),
            tasting,
          ],
        }));
      }, "Couldn't save your rating. Please try again.").then((ok) => {
        if (!ok) setData((current) => ({ ...current, tastings: previous }));
      });
    },
    [data.tastings, mutate, user.id],
  );

  const toggleFavorite = useCallback(
    (menuItemId: string) => {
      const userId = user.id;
      const wasFavorite = favouriteIds.includes(menuItemId);
      const previous = data.favorites;

      setData((current) => {
        const mine = current.favorites[userId] ?? [];
        return {
          ...current,
          favorites: {
            ...current.favorites,
            [userId]: wasFavorite
              ? mine.filter((id) => id !== menuItemId)
              : [...mine, menuItemId],
          },
        };
      });

      void mutate(async () => {
        await fetchJson(
          `/api/users/${encodeURIComponent(userId)}/favorites/${encodeURIComponent(menuItemId)}`,
          { method: wasFavorite ? "DELETE" : "PUT", body: JSON.stringify({ favorite: !wasFavorite }) },
        );
      }, "Couldn't save your favorites. Please try again.").then((ok) => {
        if (!ok) setData((current) => ({ ...current, favorites: previous }));
      });
    },
    [data.favorites, favouriteIds, mutate, user.id],
  );

  const updatePreferences = useCallback(
    (patch: Partial<TastePreferences>) => {
      const userId = user.id;
      const previous = data.users;

      setData((current) => ({
        ...current,
        users: current.users.map((candidate) =>
          candidate.id === userId
            ? { ...candidate, preferences: { ...candidate.preferences, ...patch } }
            : candidate,
        ),
      }));

      void mutate(async () => {
        const updated = await fetchJson<User>(
          `/api/users/${encodeURIComponent(userId)}/preferences`,
          { method: "PATCH", body: JSON.stringify(patch) },
        );
        setData((current) => ({
          ...current,
          users: current.users.map((candidate) =>
            candidate.id === updated.id ? updated : candidate,
          ),
        }));
      }, "Couldn't save your taste profile. Please try again.").then((ok) => {
        if (!ok) setData((current) => ({ ...current, users: previous }));
      });
    },
    [data.users, mutate, user.id],
  );

  const resetDemoData = useCallback(() => {
    void mutate(async () => {
      await fetchJson("/api/dev/reset", {
        method: "POST",
        body: JSON.stringify({ confirm: "RESET_DEMO_DATA" }),
      });
      setActiveUserId(null);
      try {
        window.localStorage.removeItem(ACTIVE_USER_KEY);
      } catch {
        // Non-critical.
      }
      reload();
    }, "Couldn't reset the demo data. Please try again.");
  }, [mutate, reload]);

  const value = useMemo<AppContextValue>(
    () => ({
      status,
      error,
      mutationError,
      dismissMutationError,
      reload,
      users: data.users,
      cafes: data.cafes,
      menu: data.menu,
      visits: data.visits,
      tastings: data.tastings,
      user,
      recommenderInput: {
        user,
        users: data.users,
        cafes: data.cafes,
        menu: data.menu,
        visits: data.visits,
        tastings: data.tastings,
        primaryCafeId: PRIMARY_CAFE_ID,
      },
      setActiveUser,
      addVisit,
      rateItem,
      toggleFavorite,
      isFavorite: (menuItemId: string) => favouriteIds.includes(menuItemId),
      favouriteIds,
      updatePreferences,
      resetDemoData,
    }),
    [
      status,
      error,
      mutationError,
      dismissMutationError,
      reload,
      data,
      user,
      favouriteIds,
      setActiveUser,
      addVisit,
      rateItem,
      toggleFavorite,
      updatePreferences,
      resetDemoData,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside <AppProvider>");
  return context;
}
