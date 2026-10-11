"use client";

import { Coffee, Heart, Lock, MapPin, Users } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/lib/store";
import type { MenuItem, Visit, VisitItem } from "@/lib/types";
import { buttonPrimary, card } from "@/lib/ui";
import { cn, formatVisitDate } from "@/lib/utils";
import { AddVisitDialog } from "./AddVisitDialog";
import { TasteProfileEditor } from "./TasteProfileEditor";
import { StarRating } from "./ui/Rating";
import { SectionHeader } from "./ui/SectionHeader";
import { AccentTag } from "./ui/TasteTag";

function resolveItem(line: VisitItem, menu: MenuItem[]): { name: string; isDrink: boolean } {
  const item = line.menuItemId ? menu.find((entry) => entry.id === line.menuItemId) : undefined;
  if (item) return { name: item.name, isDrink: item.category === "drinks" };
  // Manually typed items are not in the catalogue, so keep them in the running
  // rather than silently dropping them from the "favorite drink" stat.
  return { name: line.name, isDrink: true };
}

function summarizeVisits(visits: Visit[], menu: MenuItem[]) {
  let ratedCount = 0;
  let ratingSum = 0;
  const drinkCounts = new Map<string, { name: string; count: number }>();

  for (const visit of visits) {
    for (const line of visit.items) {
      if (line.rating > 0) {
        ratedCount += 1;
        ratingSum += line.rating;
      }
      if (line.rating < 4) continue;
      const resolved = resolveItem(line, menu);
      if (!resolved.isDrink) continue;
      const key = line.menuItemId ?? resolved.name.toLowerCase();
      const existing = drinkCounts.get(key);
      drinkCounts.set(key, {
        name: resolved.name,
        count: (existing?.count ?? 0) + 1,
      });
    }
  }

  let favoriteDrink: string | undefined;
  let best = 0;
  for (const entry of drinkCounts.values()) {
    if (entry.count > best) {
      best = entry.count;
      favoriteDrink = entry.name;
    }
  }

  return {
    total: visits.length,
    average: ratedCount ? ratingSum / ratedCount : undefined,
    favoriteDrink,
  };
}

export function CafeMemory() {
  const { user, visits, cafes, menu } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);

  const myVisits = visits.filter((visit) => visit.userId === user.id);
  const sortedVisits = [...myVisits].sort((a, b) => b.date.localeCompare(a.date));
  const summary = summarizeVisits(myVisits, menu);

  const openDialog = () => setDialogOpen(true);
  const closeDialog = () => setDialogOpen(false);

  return (
    <section className="space-y-8" aria-label="My memory">
      <SectionHeader
        title="My Memory"
        description="Your café visits, ratings and taste profile."
        action={
          <button type="button" onClick={openDialog} className={buttonPrimary}>
            Add visit
          </button>
        }
      />

      {myVisits.length ? (
        <dl className="flex flex-wrap gap-x-10 gap-y-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-espresso-400">
              Total visits
            </dt>
            <dd className="mt-1 font-display text-2xl font-semibold text-espresso-900">
              {summary.total}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-espresso-400">
              Average rating
            </dt>
            <dd className="mt-1 font-display text-2xl font-semibold text-espresso-900">
              {summary.average !== undefined ? summary.average.toFixed(1) : "None yet"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-espresso-400">
              Favorite drink
            </dt>
            <dd
              className={cn(
                "mt-1 font-display text-lg",
                summary.favoriteDrink
                  ? "font-semibold text-espresso-900"
                  : "font-medium text-espresso-400",
              )}
            >
              {summary.favoriteDrink ?? "None yet"}
            </dd>
          </div>
        </dl>
      ) : null}

      <TasteProfileEditor />

      {sortedVisits.length ? (
        <section className="space-y-5" aria-label="Visit timeline">
          <h3 className="font-display text-base font-semibold text-espresso-900">Timeline</h3>
          <div className="relative">
            <span aria-hidden className="absolute left-2 top-2 bottom-2 w-px bg-cream-300" />
            <ol className="space-y-7">
              {sortedVisits.map((visit) => {
                const cafe = cafes.find((entry) => entry.id === visit.cafeId);
                return (
                  <li key={visit.id} className="relative pl-8">
                    <span
                      aria-hidden
                      className="absolute left-2 top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-caramel-500 bg-cream-50"
                    />
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <h4 className="font-display text-base font-semibold text-espresso-900">
                        {cafe?.name ?? "Café"}
                      </h4>
                      <time dateTime={visit.date} className="text-xs text-espresso-400">
                        {formatVisitDate(visit.date)}
                      </time>
                    </div>
                    {cafe?.area ? (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-espresso-400">
                        <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                        {cafe.area}
                      </p>
                    ) : null}

                    <ul className="mt-3 space-y-1.5">
                      {visit.items.map((line, index) => (
                        <li
                          key={`${line.menuItemId ?? line.name}-${index}`}
                          className="flex flex-wrap items-center gap-x-3 gap-y-1"
                        >
                          <span className="text-sm font-medium text-espresso-700">{line.name}</span>
                          <StarRating value={line.rating} />
                          <span className="text-xs text-espresso-400">{line.rating}/5</span>
                          {line.rating >= 4 ? (
                            <span className="inline-flex items-center gap-1">
                              <Heart
                                className="h-3 w-3 fill-caramel-500 text-caramel-500"
                                strokeWidth={2}
                                aria-hidden
                              />
                              <AccentTag label="Favorite" />
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>

                    {visit.note ? (
                      <blockquote className="mt-3 border-l-2 border-cream-300 pl-3 text-sm italic leading-relaxed text-espresso-500">
                        “{visit.note}”
                      </blockquote>
                    ) : null}

                    <span
                      className={cn(
                        "mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                        visit.shared
                          ? "border-caramel-200 bg-caramel-50 text-caramel-700"
                          : "border-cream-300 bg-white text-espresso-500",
                      )}
                    >
                      {visit.shared ? (
                        <Users className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                      ) : (
                        <Lock className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                      )}
                      {visit.shared ? "Shared with friends" : "Private"}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      ) : (
        <div className={cn(card, "flex flex-col items-center gap-3 px-6 py-12 text-center")}>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-caramel-50 text-caramel-600">
            <Coffee className="h-6 w-6" strokeWidth={1.75} aria-hidden />
          </span>
          <h3 className="font-display text-lg font-semibold text-espresso-900">No visits yet</h3>
          <p className="max-w-sm text-sm text-espresso-500">
            Log your first café visit to start building your taste memory. Every visit makes the
            recommendations sharper.
          </p>
          <button type="button" onClick={openDialog} className={buttonPrimary}>
            Add your first visit
          </button>
        </div>
      )}

      <AddVisitDialog open={dialogOpen} onClose={closeDialog} />
    </section>
  );
}
