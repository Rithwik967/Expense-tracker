"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Amount } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { getRemainingBudget, getTotalAvailableForMonth } from "@/lib/finance/monthly-balance";
import type { MonthlySummary } from "@/lib/finance/types";
import { formatMonthNameOnly } from "@/lib/utils/formatting";

/**
 * The month at a glance.
 *
 * "Available this month" is the month's own budget plus whatever was carried
 * in, which is the ₹9,000 + ₹800 = ₹9,800 idea made explicit. The carried
 * figure is shown as a component of that total and never added a second time —
 * it reaches the balance through the running total, not through a transaction.
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
  const carriedIn = summary.carryForward;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{formatMonthNameOnly(summary.month)} so far</CardTitle>
        <p className="tabular text-xs text-ink-muted">
          <Amount value={summary.dailyAllowance} currency={currency} withDecimals /> a day
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <p className="tabular text-sm font-semibold text-ink">
              <Amount value={summary.totalSpent} currency={currency} /> spent
            </p>
            <p className="tabular text-xs text-ink-muted">
              of <Amount value={totalAvailable} currency={currency} />
            </p>
          </div>
          <Progress
            value={summary.totalSpent}
            max={totalAvailable}
            label={`Spent ${summary.totalSpent / 100} of ${totalAvailable / 100}`}
          />
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4">
          <div className="min-w-0">
            <dt className="truncate text-xs text-ink-muted">Monthly budget</dt>
            <dd className="tabular mt-0.5 text-sm font-semibold text-ink">
              <Amount value={summary.monthlyBudget} currency={currency} />
            </dd>
          </div>

          <div className="min-w-0">
            <dt className="truncate text-xs text-ink-muted">
              {carriedIn < 0 ? "Carried debt" : "Carried in"}
            </dt>
            <dd
              className={`tabular mt-0.5 text-sm font-semibold ${
                carriedIn < 0 ? "text-negative" : carriedIn > 0 ? "text-positive" : "text-ink"
              }`}
            >
              <Amount value={carriedIn} currency={currency} signed />
            </dd>
          </div>

          <div className="min-w-0">
            <dt className="truncate text-xs text-ink-muted">Money added</dt>
            <dd className="tabular mt-0.5 text-sm font-semibold text-ink">
              <Amount value={summary.totalIncome} currency={currency} />
            </dd>
          </div>

          <div className="min-w-0">
            <dt className="truncate text-xs text-ink-muted">Remaining</dt>
            <dd
              className={`tabular mt-0.5 text-sm font-semibold ${
                remaining < 0 ? "text-negative" : "text-ink"
              }`}
            >
              <Amount value={remaining} currency={currency} />
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
