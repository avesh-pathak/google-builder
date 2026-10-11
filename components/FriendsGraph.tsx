"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { getFriendView, getTasteSimilarity, menuItemById } from "@/lib/recommender";
import type { Temperature, User } from "@/lib/types";
import {
  capitalize,
  cn,
  describePreferences,
  formatPrice,
  formatVisitDate,
} from "@/lib/utils";
import { buttonSecondary, cardInteractive, chipBase, chipOn } from "@/lib/ui";
import { Avatar } from "./ui/Avatar";
import { DemoBadge, SectionHeader } from "./ui/SectionHeader";
import { StarRating } from "./ui/Rating";
import { Modal } from "./ui/Modal";
import { FriendDetailCard } from "./FriendDetailCard";

/**
 * The Friend-Powered Taste Graph.
 *
 * The visual graph is a decorative layer over an accessible list of cards:
 * every fact the connectors imply is written out in the cards themselves, so
 * the picture is never the only way to reach the information.
 */

interface Connector {
  id: string;
  d: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function temperatureLabel(temperature: Temperature): string {
  if (temperature === "both") return "Hot or cold";
  return capitalize(temperature);
}

export function FriendsGraph() {
  const { user, users, cafes, menu, visits, recommenderInput } = useApp();

  const wrapperRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);

  const friends = useMemo(
    () =>
      user.friendIds
        .map((id) => users.find((candidate) => candidate.id === id))
        .filter((candidate): candidate is User => Boolean(candidate)),
    [user.friendIds, users],
  );

  const cards = useMemo(
    () =>
      friends.map((friend) => {
        const view = getFriendView(recommenderInput, friend.id);
        return {
          friend,
          similarity: getTasteSimilarity(user, friend, visits, menu),
          latestShared: view?.sharedVisits[0],
          top: view?.recommended[0],
        };
      }),
    [friends, recommenderInput, user, visits, menu],
  );

  const activeView = useMemo(
    () => (activeFriendId ? getFriendView(recommenderInput, activeFriendId) : undefined),
    [activeFriendId, recommenderInput],
  );

  const cafeName = (cafeId: string) =>
    cafes.find((cafe) => cafe.id === cafeId)?.name ?? "Café Circle";

  // Measure real positions after paint and keep them in sync with layout.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    const center = centerRef.current;
    if (!wrapper || !center) return;

    const measure = () => {
      const wrapRect = wrapper.getBoundingClientRect();
      const centerRect = center.getBoundingClientRect();

      const next: Connector[] = [];
      friends.forEach((friend, index) => {
        const element = cardRefs.current[index];
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const x1 = centerRect.left - wrapRect.left + centerRect.width / 2;
        const y1 = centerRect.bottom - wrapRect.top;
        const x2 = rect.left - wrapRect.left + rect.width / 2;
        const y2 = rect.top - wrapRect.top;
        const midY = (y1 + y2) / 2;

        next.push({
          id: friend.id,
          d: `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`,
          x1,
          y1,
          x2,
          y2,
        });
      });

      setSize({ width: wrapRect.width, height: wrapRect.height });
      setConnectors(next);
    };

    measure();

    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => measure()) : undefined;
    observer?.observe(wrapper);
    window.addEventListener("resize", measure);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [friends]);

  return (
    <section aria-label="Friends">
      <SectionHeader
        title="Friends"
        description="Recommendations come from people you trust. See whose taste lines up with yours and what they actually ordered on the visits they shared."
        action={<DemoBadge />}
      />

      <p className="mt-4 text-xs text-espresso-400">
        Similarity is a demo indicator built from seeded preferences and shared ratings, not a
        trained model.
      </p>
      <p className="sr-only">
        Each friend is listed as a card below with their taste match, favorite drink and shared
        visits. The connecting lines are decorative.
      </p>

      <div ref={wrapperRef} className="relative mt-6">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 hidden text-caramel-300 md:block"
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${size.width || 1} ${size.height || 1}`}
        >
          {connectors.map((connector) => (
            <g key={connector.id}>
              <path d={connector.d} fill="none" stroke="currentColor" strokeWidth={1} />
              <circle cx={connector.x1} cy={connector.y1} r={2.5} fill="currentColor" />
              <circle cx={connector.x2} cy={connector.y2} r={2.5} fill="currentColor" />
            </g>
          ))}
        </svg>

        <div
          ref={centerRef}
          className="relative z-10 mx-auto flex w-full max-w-xs flex-col items-center gap-2.5 rounded-2xl border border-cream-300 bg-white px-6 py-5 text-center shadow-soft"
        >
          <Avatar initials={user.initials} color={user.color} size="lg" label={user.name} />
          <div>
            <div className="flex items-center justify-center gap-2">
              <h3 className="font-display text-base font-semibold text-espresso-900">
                {user.name}
              </h3>
              <span className="rounded-full bg-caramel-50 px-2 py-0.5 text-[11px] font-semibold text-caramel-700">
                You
              </span>
            </div>
            <p className="mt-1 text-xs text-espresso-500">
              {capitalize(describePreferences(user.preferences))}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-center md:gap-5">
          {cards.map(({ friend, similarity, latestShared, top }, index) => {
            const usual = menuItemById(menu, friend.usualOrderId);
            return (
              <article
                key={friend.id}
                ref={(element) => {
                  cardRefs.current[index] = element;
                }}
                onClick={() => setActiveFriendId(friend.id)}
                className={cn(cardInteractive, "relative z-10 flex w-full cursor-pointer flex-col gap-3 p-4 md:w-64")}
              >
                <div className="flex items-center gap-2.5">
                  <Avatar initials={friend.initials} color={friend.color} size="md" label={friend.name} />
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold text-espresso-900">
                      {friend.name}
                    </h3>
                    <p className="line-clamp-2 text-xs leading-snug text-espresso-500">{friend.bio}</p>
                  </div>
                </div>

                <div className="rounded-xl bg-cream-100 px-3 py-2.5">
                  <span className={cn(chipBase, chipOn)}>{similarity.label}</span>
                  <p className="mt-1.5 text-xs leading-snug text-espresso-500">{similarity.detail}</p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-espresso-400">
                    Favorite drink
                  </p>
                  <p className="text-sm text-espresso-800">
                    {usual ? usual.name : "Not set"}
                    {friend.usualNote ? (
                      <span className="text-espresso-500"> · {friend.usualNote}</span>
                    ) : null}
                  </p>
                </div>

                <p className="text-sm text-espresso-600">
                  Sweet {friend.preferences.sweetness} · Bold {friend.preferences.bitterness} ·{" "}
                  {temperatureLabel(friend.preferences.temperature)}
                </p>

                <div className="rounded-xl border border-cream-200 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-espresso-400">
                    Latest shared visit
                  </p>
                  {latestShared ? (
                    <>
                      <p className="mt-0.5 text-sm font-medium text-espresso-800">
                        {cafeName(latestShared.cafeId)}
                      </p>
                      <p className="text-xs text-espresso-500">{formatVisitDate(latestShared.date)}</p>
                      <ul className="mt-1.5 space-y-1">
                        {latestShared.items.map((line, itemIndex) => (
                          <li
                            key={`${latestShared.id}-${itemIndex}`}
                            className="flex items-center justify-between gap-2 text-xs text-espresso-600"
                          >
                            <span className="min-w-0 truncate">{line.name}</span>
                            <StarRating value={line.rating} size={11} />
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="mt-0.5 text-sm text-espresso-400">No shared visits yet</p>
                  )}
                </div>

                {top ? (
                  <div className="rounded-xl bg-caramel-50 px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-caramel-700">
                      Top pick
                    </p>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-semibold text-espresso-800">
                        {top.item.name}
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-espresso-600">
                        {formatPrice(top.item.price)}
                      </span>
                    </div>
                    <StarRating value={top.rating} size={12} className="mt-1.5" />
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveFriendId(friend.id);
                  }}
                  className={cn(buttonSecondary, "mt-auto w-full")}
                >
                  View Recommendations
                </button>
              </article>
            );
          })}
        </div>
      </div>

      <Modal
        open={Boolean(activeFriendId && activeView)}
        onClose={() => setActiveFriendId(null)}
        title={activeView ? `${activeView.friend.name} recommends` : "Friend recommendations"}
        description="Built only from visits your friend chose to share."
        size="lg"
      >
        {activeView ? <FriendDetailCard friendView={activeView} /> : null}
      </Modal>
    </section>
  );
}
