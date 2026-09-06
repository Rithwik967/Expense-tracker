"use client";

import { cn } from "@/lib/utils/cn";

/**
 * How much of a figure has been used.
 *
 * The bar is capped at 100% so overspending cannot push it out of its track,
 * and the tone shifts once it is exceeded — the number beside it carries the
 * real amount, the bar is only the shape of it.
 */
export function Progress({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  label: string;
  className?: string;
}) {
  const ratio = max > 0 ? value / max : 0;
  const percentage = Math.min(100, Math.max(0, ratio * 100));
  const over = ratio > 1;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(value)}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-high", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300",
          over ? "bg-negative" : "bg-brand",
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
