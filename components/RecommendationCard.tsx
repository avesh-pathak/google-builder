"use client";

import { Check, Heart, MapPin, Sparkles } from "lucide-react";
import { useApp } from "@/lib/store";
import { tagLabel, type Recommendation } from "@/lib/recommender";
import { cn, formatPrice } from "@/lib/utils";
import { buttonDark, buttonSecondary, cardInteractive } from "@/lib/ui";
import { Avatar } from "./ui/Avatar";
import { CoverImage } from "./ui/CoverImage";
import { StarRating } from "./ui/Rating";
import { TasteTag } from "./ui/TasteTag";

export function RecommendationCard({
  recommendation,
  cafeName,
}: {
  recommendation: Recommendation;
  cafeName: string;
}) {
  const { toggleFavorite, isFavorite } = useApp();
  const { item, friend, reason } = recommendation;
  const saved = isFavorite(item.id);

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
        {friend ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-espresso-900/85 px-2.5 py-1 text-[11px] font-semibold text-cream-50">
            <Sparkles className="h-3 w-3" strokeWidth={2} aria-hidden />
            Friend pick
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-display text-base font-semibold text-espresso-900">{item.name}</h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-espresso-400">
            <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            {cafeName}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {item.tags.slice(0, 3).map((tag) => (
            <TasteTag key={tag} label={tagLabel(tag)} />
          ))}
        </div>

        {friend ? (
          <div className="flex items-center gap-2.5 rounded-xl bg-caramel-50 px-3 py-2">
            <Avatar initials={friend.initials} color={friend.color} size="sm" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-caramel-700">
                {friend.name} recommends this
              </span>
              <span className="text-[11px] text-espresso-500">Rated {friend.rating}/5</span>
            </span>
            <StarRating value={friend.rating} size={12} className="ml-auto" />
          </div>
        ) : null}

        <p className="text-sm leading-relaxed text-espresso-600">{reason}</p>

        <button
          type="button"
          onClick={() => toggleFavorite(item.id)}
          aria-pressed={saved}
          className={cn("mt-auto w-full", saved ? buttonSecondary : buttonDark)}
        >
          {saved ? (
            <>
              <Check className="h-4 w-4" strokeWidth={2.25} aria-hidden />
              Saved to your list
            </>
          ) : (
            <>
              <Heart className="h-4 w-4" strokeWidth={2} aria-hidden />
              Try This
            </>
          )}
        </button>
      </div>
    </article>
  );
}
