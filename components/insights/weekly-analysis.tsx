"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

import { Amount } from "@/components/ui/money";
import { abs } from "@/lib/finance/money";
import type { WeeklyBreakdown } from "@/lib/finance/types";
import { formatDateRange, pluralise } from "@/lib/utils/formatting";
import { cn } from "@/lib/utils/cn";

/**
 * Spending week by week within the month.
 *
 * Weeks are chunks of the month (1–7, 8–14, …) rather than ISO weeks.
 */
export function WeeklyAnalysis({
  weeks,
  currency,
}: {
  weeks: readonly WeeklyBreakdown[];
  currency: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {weeks.map((week) => {
        const surplus = week.difference >= 0;

        return (
          <article
            key={week.weekNumber}
            className={cn(
              "relative overflow-hidden rounded-xl bg-surface-raised p-3 shadow-card",
              surplus && week.weekNumber === 2 && "border-2 border-positive/20",
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute -right-4 -bottom-4 size-16 rounded-full blur-xl",
                surplus ? "bg-positive/10" : "bg-negative/10",
              )}
            />
            <p className="label-caps text-ink-subtle">Week {week.weekNumber}</p>
            <p className={cn("mt-2 flex items-center gap-1", surplus ? "text-positive" : "text-negative")}>
              {surplus ? (
                <TrendingUp className="size-4" aria-hidden />
              ) : (
                <TrendingDown className="size-4" aria-hidden />
              )}
              <span className="tabular text-xl font-semibold">
                <Amount value={abs(week.difference)} currency={currency} />
              </span>
            </p>
            <p className="mt-1 text-sm text-ink-muted">{surplus ? "Saved" : "Over"}</p>
            <p className="mt-1 text-xs text-ink-subtle">
              {formatDateRange(week.start, week.end)} · {week.days} {pluralise(week.days, "day")}
            </p>
          </article>
        );
      })}
    </div>
  );
}
