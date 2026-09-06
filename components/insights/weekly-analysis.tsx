"use client";

import { Amount } from "@/components/ui/money";
import { abs } from "@/lib/finance/money";
import type { WeeklyBreakdown } from "@/lib/finance/types";
import { formatDateRange, pluralise } from "@/lib/utils/formatting";

/**
 * Spending week by week within the month.
 *
 * Weeks are chunks of the month (1–7, 8–14, …) rather than ISO weeks, so every
 * week belongs to exactly one month and the rows add up to the monthly total.
 * The last chunk of most months is short, which is why each row states the
 * allowance it actually generated instead of a flat seven-day figure.
 */
export function WeeklyAnalysis({
  weeks,
  currency,
}: {
  weeks: readonly WeeklyBreakdown[];
  currency: string;
}) {
  return (
    <ul className="divide-y divide-border">
      {weeks.map((week) => {
        const surplus = week.difference >= 0;

        return (
          <li key={week.weekNumber} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">Week {week.weekNumber}</p>
                <p className="text-xs text-ink-subtle">
                  {formatDateRange(week.start, week.end)} · {week.days}{" "}
                  {pluralise(week.days, "day")}
                </p>
              </div>

              <p
                className={`tabular shrink-0 text-sm font-semibold ${
                  surplus ? "text-positive" : "text-negative"
                }`}
              >
                <Amount value={week.difference} currency={currency} signed />
              </p>
            </div>

            <dl className="mt-2 flex gap-4 text-xs">
              <div className="flex gap-1.5">
                <dt className="text-ink-muted">Allowance</dt>
                <dd className="tabular font-medium text-ink">
                  <Amount value={week.allowanceGenerated} currency={currency} />
                </dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-ink-muted">Spent</dt>
                <dd className="tabular font-medium text-ink">
                  <Amount value={week.spent} currency={currency} />
                </dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-ink-muted">{surplus ? "Surplus" : "Deficit"}</dt>
                <dd className="tabular font-medium text-ink">
                  <Amount value={abs(week.difference)} currency={currency} />
                </dd>
              </div>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}
