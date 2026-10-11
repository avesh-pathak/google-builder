"use client";

import { Coffee, ImageOff } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Remote photo with a branded fallback, so a failed image request degrades to a
 * warm tile instead of a broken-image icon.
 */
export function CoverImage({
  src,
  alt,
  sizes = "(min-width: 1024px) 33vw, 100vw",
  priority = false,
  className,
}: {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(!src);

  if (failed) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-caramel-100",
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <Coffee className="h-8 w-8 text-caramel-400" strokeWidth={1.5} aria-hidden />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}

/** Small square thumbnail used in lists and rails. */
export function Thumb({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(!src);
  return failed ? (
    <div
      className={cn("flex items-center justify-center bg-caramel-100", className)}
      role="img"
      aria-label={alt}
    >
      <ImageOff className="h-4 w-4 text-caramel-400" strokeWidth={1.5} aria-hidden />
    </div>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  );
}
