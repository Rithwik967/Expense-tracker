"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Amount } from "@/components/ui/money";
import type { MonthlySummary } from "@/lib/finance/types";
import { formatMonthLabel } from "@/lib/utils/formatting";

/**
 * Shown in place of the today card when the selected month is not the current
 * one, because "available today" means nothing in a month that has finished or
 * has not started.
 *
 * A finished month reports what it closed at; a future month reports what it
 * will open with and what it has to spend. No month is ever "closed" by the
 * user — the distinction is purely which side of today it falls on.
 */
export function MonthClosingCard({
  summary,
  currency,
}: {
  summary: MonthlySummary;
  currency: string;
}) {
  const upcoming = !summary.isComplete;
  const closing = summary.projectedEndBalance;

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-muted">
              {upcoming ? "Projected to end at" : "Ended at"}
            </p>
            <p
              className={`tabular mt-1 text-3xl font-semibold tracking-tight ${
                closing < 0 ? "text-negative" : "text-ink"
              }`}
            >
              <Amount value={closing} currency={currency} />
            </p>
            <p className="mt-1 text-xs text-ink-subtle">{formatMonthLabel(summary.month)}</p>
          </div>

          <Badge tone={upcoming ? "info" : closing < 0 ? "negative" : "positive"}>
            {upcoming ? "Not started" : closing < 0 ? "Overspent" : "Saved"}
          </Badge>
        </div>

        <dl className="grid grid-cols-3 gap-3 border-t border-border pt-3">
          <div className="min-w-0">
            <dt className="truncate text-xs text-ink-muted">Opened with</dt>
            <dd className="tabular mt-0.5 text-sm font-semibold text-ink">
              <Amount value={summary.carryForward} currency={currency} />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="truncate text-xs text-ink-muted">Allowance</dt>
            <dd className="tabular mt-0.5 text-sm font-semibold text-ink">
              <Amount value={summary.allowanceTotal} currency={currency} />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="truncate text-xs text-ink-muted">Spent</dt>
            <dd className="tabular mt-0.5 text-sm font-semibold text-ink">
              <Amount value={summary.totalSpent} currency={currency} />
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
