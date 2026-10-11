"use client";

import { Heart } from "lucide-react";
import { useMemo, useState } from "react";
import { ratingForItem, tagLabel, triedItemIds } from "@/lib/recommender";
import { useApp } from "@/lib/store";
import type { MenuItem } from "@/lib/types";
import { buttonGhost, buttonSecondary, cardInteractive } from "@/lib/ui";
import { cn, formatPrice } from "@/lib/utils";
import { CoverImage } from "./ui/CoverImage";
import { RatingInput, StarRating } from "./ui/Rating";
import { TasteTag } from "./ui/TasteTag";

export function MenuItemCard({ item }: { item: MenuItem }) {
  const { recommenderInput, rateItem, toggleFavorite, isFavorite } = useApp();
  const [ratingOpen, setRatingOpen] = useState(false);

  const tried = useMemo(
    () => triedItemIds(recommenderInput).has(item.id),
    [recommenderInput, item.id],
  );
  const rating = ratingForItem(recommenderInput, item.id);
  const saved = isFavorite(item.id);

  function chooseRating(value: number) {
    rateItem(item.id, value);
    setRatingOpen(false);
  }

  return (
    <article className={cn(cardInteractive, "flex flex-col overflow-hidden")}>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream-200">
        <CoverImage
          src={item.image}
          alt={item.name}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
        <span className="absolute left-3 top-3 rounded-full bg-cream-50/95 px-2.5 py-1 text-xs font-semibold text-espresso-800 shadow-soft">
          {formatPrice(item.price)}
        </span>
        <button
          type="button"
          onClick={() => toggleFavorite(item.id)}
          aria-pressed={saved}
          aria-label={saved ? "Remove from favorites" : "Add to favorites"}
          className={cn(
            "absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-cream-50/95 shadow-soft transition-colors duration-200 hover:bg-white",
            saved ? "text-caramel-700" : "text-espresso-600 hover:text-caramel-700",
          )}
        >
          <Heart
            className="h-4 w-4"
            strokeWidth={1.9}
            aria-hidden
            fill={saved ? "currentColor" : "none"}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-display text-base font-semibold text-espresso-900">{item.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-espresso-600">
            {item.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <TasteTag key={tag} label={tagLabel(tag)} />
          ))}
        </div>

        <div className="mt-auto pt-1">
          {ratingOpen ? (
            <div className="rounded-xl border border-cream-300 bg-cream-50 p-3">
              <p className="mb-2 text-sm font-medium text-espresso-700">How was it?</p>
              <RatingInput value={rating ?? 0} onChange={chooseRating} />
              <button
                type="button"
                onClick={() => setRatingOpen(false)}
                className={cn(buttonGhost, "-ml-1 mt-2")}
              >
                Cancel
              </button>
            </div>
          ) : tried && rating !== undefined ? (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5"
            >
              <span className="inline-flex items-center gap-2">
                <StarRating value={rating} size={14} />
                <span className="text-sm font-medium text-espresso-700">You rated {rating}/5</span>
              </span>
              <button
                type="button"
                onClick={() => setRatingOpen(true)}
                className={cn(buttonGhost, "ml-auto")}
              >
                Change rating
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setRatingOpen(true)}
              className={cn(buttonSecondary, "w-full")}
            >
              Mark as tried
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
