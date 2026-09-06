"use client";

import { Amount } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { getRemainingBudget, getTotalAvailableForMonth } from "@/lib/finance/monthly-balance";
import type { MonthlySummary } from "@/lib/finance/types";
import { differenceInCalendarDays } from "date-fns";
import { parseDateKey, lastDayOfMonth } from "@/lib/utils/dates";

/**
 * The month at a glance: budget, spent, leftover.
 */
export function MonthCard({
  summary,
  currency,
}: {
  summary: MonthlySummary;
  currency: string;
}) {
  const totalAvailable = getTotalAvailableForMonth(summary);
  const remaining = getRemainingBudget(summary);
  const daysLeft = Math.max(
    0,
    differenceInCalendarDays(parseDateKey(lastDayOfMonth(summary.month)), parseDateKey(summary.asOf)),
  );

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-semibold text-ink">Monthly Budget</h2>
        <p className="tabular text-sm text-ink-muted">
          <Amount value={summary.monthlyBudget} currency={currency} />
        </p>
      </div>

      <div className="rounded-xl bg-surface-muted p-4 shadow-card">
        <Progress
          value={summary.totalSpent}
          max={totalAvailable}
          label={`Spent ${summary.totalSpent / 100} of ${totalAvailable / 100}`}
          className="mb-4 h-3 shadow-inner"
        />
        <div className="flex items-center justify-between text-sm">
          <div className="flex flex-col">
            <span className="mb-1 text-xs text-ink-subtle">Spent</span>
            <span className="tabular font-bold text-ink">
              <Amount value={summary.totalSpent} currency={currency} />
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="mb-1 text-xs text-ink-subtle">{remaining < 0 ? "Over" : "Extra"}</span>
            <span
              className={`tabular font-bold ${remaining < 0 ? "text-negative" : "text-positive"}`}
            >
              <Amount value={remaining} currency={currency} />
            </span>
          </div>
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          <Amount value={remaining} currency={currency} /> remaining
          {daysLeft > 0 ? ` · ${daysLeft} days left` : null}
        </p>
      </div>
    </section>
  );
}
