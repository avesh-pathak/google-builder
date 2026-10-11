"use client";

import { Lock, MapPin } from "lucide-react";
import { useApp } from "@/lib/store";
import type { FriendView } from "@/lib/recommender";
import type { Temperature } from "@/lib/types";
import { capitalize, cn, formatPrice, formatVisitDate, pluralize } from "@/lib/utils";
import { chipBase, chipOff, chipOn } from "@/lib/ui";
import { Avatar } from "./ui/Avatar";
import { StarRating } from "./ui/Rating";

/**
 * The private-safe view of one friend. Rendered inside the Modal opened by
 * FriendsGraph. Visitors only ever see visits the friend marked as shared.
 */

function temperatureLabel(temperature: Temperature): string {
  if (temperature === "both") return "Hot or cold";
  return capitalize(temperature);
}

export function FriendDetailCard({ friendView }: { friendView: FriendView }) {
  const { cafes } = useApp();
  const { friend, similarity, sharedVisits, recommended, privateVisitCount } = friendView;
  const preferences = friend.preferences;

  const cafeName = (cafeId: string) =>
    cafes.find((cafe) => cafe.id === cafeId)?.name ?? "Café Circle";

  return (
    <div>
      <header className="flex items-start gap-3">
        <Avatar initials={friend.initials} color={friend.color} size="lg" label={friend.name} />
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold text-espresso-900">{friend.name}</h3>
          <div className="mt-1.5">
            <span className={cn(chipBase, chipOn)}>{similarity.label}</span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-espresso-600">{similarity.detail}</p>
        </div>
      </header>
      <p className="mt-3 text-xs text-espresso-400">
        Similarity is a demo indicator built from seeded preferences and shared ratings, not a
        trained model.
      </p>

      <section className="mt-6">
        <h4 className="font-display text-sm font-semibold text-espresso-800">Taste preferences</h4>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-espresso-400">
              Sweetness
            </dt>
            <dd className="text-sm text-espresso-700">{preferences.sweetness}/5</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-espresso-400">
              Bitterness
            </dt>
            <dd className="text-sm text-espresso-700">{preferences.bitterness}/5</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-espresso-400">
              Temperature
            </dt>
            <dd className="text-sm text-espresso-700">
              {temperatureLabel(preferences.temperature)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-espresso-400">
              Budget
            </dt>
            <dd className="text-sm text-espresso-700">{capitalize(preferences.budget)}</dd>
          </div>
        </dl>

        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-espresso-400">
            Favorite flavors
          </p>
          {preferences.favoriteFlavors.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {preferences.favoriteFlavors.map((flavor) => (
                <span key={flavor} className={cn(chipBase, chipOff)}>
                  {flavor}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-espresso-400">None listed</p>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h4 className="font-display text-sm font-semibold text-espresso-800">
          Recommended by {friend.name}
        </h4>
        {recommended.length ? (
          <ul className="mt-3 divide-y divide-cream-200 overflow-hidden rounded-2xl border border-cream-300 bg-white">
            {recommended.map(({ item, rating, cafeId }) => (
              <li key={item.id} className="flex items-center gap-3 px-3.5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-espresso-800">{item.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-espresso-500">
                    <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                    {cafeName(cafeId)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-sm font-semibold text-espresso-700">
                    {formatPrice(item.price)}
                  </span>
                  <StarRating value={rating} size={12} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-espresso-400">No standout picks shared yet.</p>
        )}
      </section>

      <section className="mt-6">
        <h4 className="font-display text-sm font-semibold text-espresso-800">Shared visits</h4>
        {sharedVisits.length ? (
          <ul className="mt-3 space-y-2.5">
            {sharedVisits.map((visit) => (
              <li key={visit.id} className="rounded-2xl border border-cream-300 bg-white px-3.5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-espresso-800">
                    {cafeName(visit.cafeId)}
                  </span>
                  <span className="shrink-0 text-xs text-espresso-400">
                    {formatVisitDate(visit.date)}
                  </span>
                </div>
                <ul className="mt-2 space-y-1">
                  {visit.items.map((line, itemIndex) => (
                    <li
                      key={`${visit.id}-${itemIndex}`}
                      className="flex items-center justify-between gap-2 text-xs text-espresso-600"
                    >
                      <span className="min-w-0 truncate">{line.name}</span>
                      <StarRating value={line.rating} size={11} />
                    </li>
                  ))}
                </ul>
                {visit.note ? (
                  <p className="mt-2 text-xs italic leading-relaxed text-espresso-500">
                    {visit.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-espresso-400">No shared visits yet.</p>
        )}
      </section>

      <div className="mt-6 flex items-start gap-2.5 rounded-2xl bg-cream-100 px-3.5 py-3">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-espresso-400" strokeWidth={1.75} aria-hidden />
        <p className="text-xs leading-relaxed text-espresso-500">
          Only visits {friend.name} marked as shared are shown here.
          {privateVisitCount > 0
            ? ` ${privateVisitCount} ${pluralize(privateVisitCount, "private visit")} not shown.`
            : ""}
        </p>
      </div>
    </div>
  );
}
