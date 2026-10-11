"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read-only rating display. */
export function StarRating({
  value,
  size = 14,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          strokeWidth={1.5}
          aria-hidden
          className={star <= value ? "fill-caramel-500 text-caramel-500" : "text-cream-400"}
        />
      ))}
    </span>
  );
}

/** Interactive 1–5 picker used in the "add visit" form. */
export function RatingInput({
  value,
  onChange,
  id,
}: {
  value: number;
  onChange: (value: number) => void;
  id?: string;
}) {
  return (
    <div className="flex items-center gap-2" id={id} role="group" aria-label="Rating out of 5">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            aria-label={`${star} out of 5`}
            aria-pressed={star === value}
            className="rounded-full p-0.5 transition-transform duration-150 hover:scale-110 active:scale-95"
          >
            <Star
              size={22}
              strokeWidth={1.5}
              aria-hidden
              className={
                star <= value
                  ? "fill-caramel-500 text-caramel-500"
                  : "text-cream-400 hover:text-caramel-300"
              }
            />
          </button>
        ))}
      </div>
      <span className="text-sm font-medium text-espresso-600">{value}/5</span>
    </div>
  );
}
