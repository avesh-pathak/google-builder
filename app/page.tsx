"use client";

import { Coffee, Loader2, RefreshCw, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { CafeMemory } from "@/components/CafeMemory";
import { DiscoverDashboard } from "@/components/DiscoverDashboard";
import { FriendsGraph } from "@/components/FriendsGraph";
import { MenuExplorer } from "@/components/MenuExplorer";
import type { TabId } from "@/components/navigation";
import { useApp } from "@/lib/store";
import { buttonPrimary, buttonSecondary } from "@/lib/ui";

/**
 * The single-page application shell. Phase 1 kept navigation in local state and
 * read seed data; Phase 2 keeps the same shell but gates it on a real backend
 * load and surfaces failures instead of rendering an empty app.
 */
export default function Page() {
  const [tab, setTab] = useState<TabId>("discover");
  const { status, error, reload, mutationError, dismissMutationError } = useApp();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  if (status === "loading") {
    return <StatusScreen status="loading" />;
  }

  if (status === "error") {
    return <StatusScreen status="error" message={error} onRetry={reload} />;
  }

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-espresso-800 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-cream-50"
      >
        Skip to content
      </a>

      <AppHeader tab={tab} onTabChange={setTab} />

      <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-12 pt-8 sm:px-6 sm:pt-12">
        {tab === "discover" ? <DiscoverDashboard onNavigate={setTab} /> : null}
        {tab === "menu" ? <MenuExplorer /> : null}
        {tab === "memory" ? <CafeMemory /> : null}
        {tab === "friends" ? <FriendsGraph /> : null}
      </main>

      <footer className="border-t border-cream-300 pb-24 pt-8 md:pb-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-1.5 px-4 text-xs text-espresso-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Café Circle AI · Phase 2 · All cafés, prices and people are demo data.</p>
          <p>Data is stored in PostgreSQL. No Gemini, no payments in this phase.</p>
        </div>
      </footer>

      <BottomNav tab={tab} onTabChange={setTab} />

      {mutationError ? (
        <div
          role="status"
          className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-caramel-300 bg-caramel-50 px-4 py-3 shadow-lifted md:bottom-6"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-caramel-700" strokeWidth={2} aria-hidden />
          <p className="flex-1 text-sm text-espresso-700">{mutationError}</p>
          <button
            type="button"
            onClick={dismissMutationError}
            aria-label="Dismiss"
            className="rounded-full p-1 text-espresso-500 transition-colors hover:bg-caramel-100 hover:text-espresso-800"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </div>
      ) : null}
    </>
  );
}

function StatusScreen({
  status,
  message,
  onRetry,
}: {
  status: "loading" | "error";
  message?: string | null;
  onRetry?: () => void;
}) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-cream-300 bg-white p-8 text-center shadow-soft">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-espresso-800 text-cream-50">
          <Coffee className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </span>

        {status === "loading" ? (
          <>
            <h1 className="mt-5 font-display text-lg font-semibold text-espresso-900">
              Loading your café experience
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-espresso-500">
              Fetching cafés, menus and your memories from the database.
            </p>
            <p className="mt-5 flex items-center justify-center gap-2 text-sm text-espresso-400">
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" strokeWidth={2} aria-hidden />
              Connecting
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-5 font-display text-lg font-semibold text-espresso-900">
              We couldn&apos;t load your café data
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-espresso-500">
              {message ?? "Please try again."}
            </p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <button type="button" onClick={onRetry} className={buttonPrimary}>
                <RefreshCw className="h-4 w-4" strokeWidth={2} aria-hidden />
                Try again
              </button>
              <a href="/api/health" className={buttonSecondary}>
                Check database health
              </a>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
