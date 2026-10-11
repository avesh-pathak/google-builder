"use client";

import { cn } from "@/lib/utils";
import { TABS, type TabId } from "./navigation";

/** Mobile-first navigation. Sits below `md`, where the header nav is hidden. */
export function BottomNav({
  tab,
  onTabChange,
}: {
  tab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-cream-300 bg-cream-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Main"
    >
      <div className="mx-auto grid max-w-lg grid-cols-4">
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
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-caramel-700" : "text-espresso-400 hover:text-espresso-700",
              )}
            >
              <Icon
                className={cn("h-5 w-5", active && "text-caramel-600")}
                strokeWidth={active ? 2.25 : 1.75}
                aria-hidden
              />
              {item.shortLabel}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
