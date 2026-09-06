"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Amount } from "@/components/ui/money";
import { type Money } from "@/lib/finance/money";
import type { DailyBalance } from "@/lib/finance/types";
import { formatDayLabel } from "@/lib/utils/formatting";

/**
 * The headline: what today is actually worth.
 *
 * Two figures matter and they are not the same. "Available now" is the day's
 * closing balance — yesterday's leftover, plus today's allowance, minus what
 * has already gone. "Started with" is that same figure before any of today's
 * spending, which is what makes it obvious where the money went.
 *
 * A negative balance is stated plainly rather than clamped to zero: the user
 * has drawn on future allowance and the coming days will recover it.
 */
export function TodayCard({
  balance,
  startOfDayAvailable,
  currency,
}: {
  balance: DailyBalance;
  startOfDayAvailable: Money;
  currency: string;
}) {
  const negative = balance.endingBalance < 0;
  const spentToday = balance.totalSpent;

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-muted">Available today</p>
            <p
              className={`tabular mt-1 text-4xl font-semibold tracking-tight ${
                negative ? "text-negative" : "text-ink"
              }`}
            >
              <Amount value={balance.endingBalance} currency={currency} withDecimals={false} />
            </p>
            <p className="mt-1 text-xs text-ink-subtle">{formatDayLabel(balance.date)}</p>
          </div>

          {negative ? (
            <Badge tone="negative" className="shrink-0">
              <TrendingDown className="size-3" aria-hidden />
              Using future allowance
            </Badge>
          ) : spentToday === 0 ? (
            <Badge tone="brand" className="shrink-0">
              <TrendingUp className="size-3" aria-hidden />
              Nothing spent yet
            </Badge>
          ) : null}
        </div>

        <dl className="grid grid-cols-3 gap-3 border-t border-border pt-3">
          <div className="min-w-0">
            <dt className="truncate text-xs text-ink-muted">Started with</dt>
            <dd className="tabular mt-0.5 text-sm font-semibold text-ink">
              <Amount value={startOfDayAvailable} currency={currency} />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="truncate text-xs text-ink-muted">Today&apos;s allowance</dt>
            <dd className="tabular mt-0.5 text-sm font-semibold text-ink">
              <Amount value={balance.dailyAllowance} currency={currency} withDecimals />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="truncate text-xs text-ink-muted">Spent today</dt>
            <dd className="tabular mt-0.5 text-sm font-semibold text-ink">
              <Amount value={spentToday} currency={currency} />
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
