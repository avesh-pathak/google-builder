import { cn } from "@/lib/utils";

export function TasteTag({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-cream-200 px-2.5 py-1 text-[11px] font-medium tracking-wide text-espresso-600",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function AccentTag({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-caramel-50 px-2.5 py-1 text-[11px] font-semibold text-caramel-700",
        className,
      )}
    >
      {label}
    </span>
  );
}
