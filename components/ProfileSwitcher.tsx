"use client";

import { Check, ChevronDown, RotateCcw, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Avatar } from "./ui/Avatar";

/**
 * Demo profile switcher. No auth — we just let the presenter jump between the
 * three seeded users, and everything in the app follows.
 */
export function ProfileSwitcher() {
  const { users, user, setActiveUser, resetDemoData } = useApp();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-2 rounded-full border border-cream-300 bg-white py-1.5 pl-1.5 pr-2.5 text-sm font-medium text-espresso-700 transition-colors hover:border-caramel-300 hover:bg-caramel-50"
      >
        <Avatar initials={user.initials} color={user.color} size="sm" />
        <span className="hidden sm:inline">{user.name}</span>
        <ChevronDown
          className={cn("h-4 w-4 text-espresso-400 transition-transform", open && "rotate-180")}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Switch demo profile"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 overflow-hidden rounded-2xl border border-cream-300 bg-white shadow-lifted"
        >
          <p className="flex items-center gap-2 border-b border-cream-200 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-espresso-400">
            <Users className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            Demo profiles
          </p>
          <div className="p-1.5">
            {users.map((candidate) => {
              const active = candidate.id === user.id;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setActiveUser(candidate.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors",
                    active ? "bg-caramel-50" : "hover:bg-cream-100",
                  )}
                >
                  <Avatar initials={candidate.initials} color={candidate.color} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-espresso-800">
                      {candidate.name}
                      {active ? (
                        <Check className="h-3.5 w-3.5 text-caramel-600" strokeWidth={2.5} aria-hidden />
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-espresso-500">
                      {candidate.bio}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              resetDemoData();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 border-t border-cream-200 px-4 py-3 text-xs font-medium text-espresso-500 transition-colors hover:bg-cream-100 hover:text-espresso-700"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            Reset demo data
          </button>
        </div>
      ) : null}
    </div>
  );
}
