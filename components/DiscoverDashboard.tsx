"use client";

import { ArrowRight, Heart, MapPin, Plus, Sparkles, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  cafeNameFor,
  getFriendsFavourites,
  getFriendRecommendations,
  getTasteDiscoveries,
  getUsualOrder,
} from "@/lib/recommender";
import { useApp } from "@/lib/store";
import { buttonPrimary, buttonSecondary, card, cardInteractive } from "@/lib/ui";
import { cn, formatPrice, formatVisitDate, greetingFor } from "@/lib/utils";
import { Avatar } from "./ui/Avatar";
import { CoverImage, Thumb } from "./ui/CoverImage";
import { EmptyState } from "./ui/EmptyState";
import { StarRating } from "./ui/Rating";
import { DemoBadge, SectionHeader } from "./ui/SectionHeader";
import { TasteTag } from "./ui/TasteTag";
import { RecommendationCard } from "./RecommendationCard";
import type { TabId } from "./navigation";

export function DiscoverDashboard({ onNavigate }: { onNavigate: (tab: TabId) => void }) {
  const { user, recommenderInput } = useApp();

  // Time-of-day greeting resolves after mount so server and client markup match.
  const [greeting, setGreeting] = useState<string | null>(null);
  useEffect(() => {
    setGreeting(greetingFor());
  }, []);

  const usual = useMemo(() => getUsualOrder(recommenderInput), [recommenderInput]);
  const friendPicks = useMemo(
    () => getFriendRecommendations(recommenderInput, 3),
    [recommenderInput],
  );
  const pickedIds = useMemo(() => friendPicks.map((pick) => pick.item.id), [friendPicks]);
  const discoveries = useMemo(
    () => getTasteDiscoveries(recommenderInput, pickedIds, 3),
    [recommenderInput, pickedIds],
  );
  const favourites = useMemo(
    () => getFriendsFavourites(recommenderInput, 2),
    [recommenderInput],
  );

  const usualCafeName = usual ? cafeNameFor(recommenderInput, usual.cafeId) : "";

  return (
    <div className="flex flex-col gap-14">
      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12">
        <div>
          <h1 className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-espresso-900 sm:text-4xl lg:text-[2.75rem]">
            {greeting ? `${greeting}, ${user.name}` : `Hi ${user.name}`}{" "}
            <span aria-hidden>☕</span>
          </h1>
          <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-espresso-500">
            Your next favorite coffee might already be on your friends’ list.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className={buttonPrimary} onClick={() => onNavigate("menu")}>
              Explore the menu
              <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
            <button type="button" className={buttonSecondary} onClick={() => onNavigate("memory")}>
              <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
              Add a visit
            </button>
          </div>
          <p className="mt-6 max-w-[46ch] border-t border-cream-300 pt-5 text-sm leading-relaxed text-espresso-500">
            {user.bio}
          </p>
        </div>

        {usual ? (
          <div className={cn(card, "overflow-hidden")}>
            <div className="relative aspect-[16/10] w-full bg-cream-200">
              <CoverImage
                src={usual.item.image}
                alt={usual.item.name}
                sizes="(min-width: 1024px) 45vw, 100vw"
                priority
              />
              <span className="absolute left-3 top-3 rounded-full bg-espresso-900/85 px-3 py-1 text-[11px] font-semibold text-cream-50">
                Your usual order
              </span>
            </div>
            <div className="p-5">
              <h2 className="font-display text-lg font-semibold text-espresso-900">
                {usual.item.name}
              </h2>
              <p className="mt-1 flex items-center gap-1 text-sm text-espresso-500">
                <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                {usualCafeName}
                <span className="text-espresso-300">·</span>
                {formatPrice(usual.item.price)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-caramel-50 px-2.5 py-1 text-xs font-semibold text-caramel-700">
                  <Sparkles className="h-3 w-3" strokeWidth={2} aria-hidden />
                  {usual.note}
                </span>
                {usual.lastVisit ? (
                  <span className="text-xs text-espresso-400">
                    Last ordered {formatVisitDate(usual.lastVisit.date)}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => onNavigate("memory")}
                className={cn(buttonSecondary, "mt-4 w-full")}
              >
                View previous order
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section>
        <SectionHeader
          title="Recommended for you"
          description="Friends you trust, filtered down to things you have not tried yet."
          action={<DemoBadge />}
        />
        {friendPicks.length ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {friendPicks.map((pick) => (
              <RecommendationCard
                key={pick.item.id}
                recommendation={pick}
                cafeName={cafeNameFor(recommenderInput, pick.cafeId)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            className="mt-5"
            icon={Users}
            title="No friend picks yet"
            description="Recommendations appear once a friend shares a visit and rates something 4 or higher. Add your own visit in the meantime."
            action={
              <button type="button" className={buttonSecondary} onClick={() => onNavigate("memory")}>
                Add a visit
              </button>
            }
          />
        )}
      </section>

      <section>
        <SectionHeader
          title="Friends’ favorites"
          description="What your circle keeps ordering again and again."
          action={<DemoBadge />}
        />
        {favourites.length ? (
          <div className="scrollbar-none -mx-4 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {favourites.map((favourite) => (
              <article
                key={`${favourite.friend.id}-${favourite.item.id}`}
                className={cn(cardInteractive, "w-[248px] shrink-0 snap-start overflow-hidden sm:w-[264px]")}
              >
                <div className="h-32 w-full overflow-hidden bg-cream-200">
                  <Thumb
                    src={favourite.item.image}
                    alt={favourite.item.name}
                    className="h-full w-full"
                  />
                </div>
                <div className="flex flex-col gap-2 p-4">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-caramel-700">
                    {favourite.friend.name}’s favorite
                  </span>
                  <h3 className="font-display text-base font-semibold leading-snug text-espresso-900">
                    {favourite.item.name}
                  </h3>
                  <p className="flex items-center gap-1 text-xs text-espresso-400">
                    <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                    {cafeNameFor(recommenderInput, favourite.cafeId)}
                    <span className="text-espresso-300">·</span>
                    {formatPrice(favourite.item.price)}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <StarRating value={favourite.rating} size={13} />
                    <Avatar
                      initials={favourite.friend.initials}
                      color={favourite.friend.color}
                      size="sm"
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            className="mt-5"
            icon={Heart}
            title="Nothing shared yet"
            description="When your friends share a visit, their favorite drinks and dishes show up here."
          />
        )}
      </section>

      <section>
        <SectionHeader
          title="Discover something new"
          description="Taste matches you have not tried yet, based on your own ratings."
          action={<DemoBadge />}
        />
        {discoveries.length ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {discoveries.map((pick) => (
              <RecommendationCard
                key={pick.item.id}
                recommendation={pick}
                cafeName={cafeNameFor(recommenderInput, pick.cafeId)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            className="mt-5"
            icon={Sparkles}
            title="You have tried everything on this menu"
            description="Add a new café visit or rate a few menu items to unlock fresh suggestions."
            action={
              <button type="button" className={buttonSecondary} onClick={() => onNavigate("menu")}>
                Explore the menu
              </button>
            }
          />
        )}
        <p className="mt-4 flex items-center gap-2 text-xs text-espresso-400">
          <TasteTag label="Deterministic" />
          Explanations come from your saved ratings and shared friend visits. No AI scores yet.
        </p>
      </section>
    </div>
  );
}
