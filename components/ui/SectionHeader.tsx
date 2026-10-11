import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="max-w-[62ch]">
        <h2 className="font-display text-xl font-semibold tracking-tight text-espresso-900 sm:text-2xl">
          {title}
        </h2>
        {description ? <p className="mt-1.5 text-sm text-espresso-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function DemoBadge({ label = "Demo data" }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-cream-400 px-2.5 py-1 text-[11px] font-medium tracking-wide text-espresso-400">
      {label}
    </span>
  );
}
