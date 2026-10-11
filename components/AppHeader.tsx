"use client";

import { Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import { TABS, type TabId } from "./navigation";
import { ProfileSwitcher } from "./ProfileSwitcher";

export function AppHeader({
  tab,
  onTabChange,
}: {
  tab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-cream-300/80 bg-cream-100/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-espresso-800 text-cream-50">
            <Coffee className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-display text-[15px] font-semibold text-espresso-900">
              Café Circle AI
            </span>
            <span className="hidden text-[11px] text-espresso-400 sm:block">
              Your taste. Your friends. Your café.
            </span>
          </span>
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {TABS.map((item) => {
            const active = item.id === tab;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-200",
                  active
                    ? "bg-espresso-800 text-cream-50"
                    : "text-espresso-600 hover:bg-cream-200 hover:text-espresso-900",
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                {item.label}
              </button>
            );
          })}
        </nav>

        <ProfileSwitcher />
      </div>
    </header>
  );
}
