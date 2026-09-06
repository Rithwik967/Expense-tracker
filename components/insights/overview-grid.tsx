"use client";

import { Card, CardContent, Stat } from "@/components/ui/card";
import { Amount } from "@/components/ui/money";
import type { CategorySlice } from "@/hooks/use-insights";
import type { Money } from "@/lib/finance/money";
import type { DateKey, MonthlySummary } from "@/lib/finance/types";
import { formatDayLabel, formatPercentage } from "@/lib/utils/formatting";

/**
 * The month's headline numbers.
 *
 * Every value is taken from the same monthly summary Home renders, so the
 * spending total here is the spending total there — there is one calculation,
 * read twice.
 */
export function OverviewGrid({
  summary,
  averageDailySpend,
  highestSpendingDay,
  largestCategory,
  funFund,
  currency,
}: {
  summary: MonthlySummary;
  averageDailySpend: Money;
  highestSpendingDay: { date: DateKey; amount: Money } | null;
  largestCategory: CategorySlice | null;
  funFund: Money;
  currency: string;
}) {
  return (
    <Card>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
          <Stat
            label="Monthly budget"
            value={<Amount value={summary.monthlyBudget} currency={currency} />}
          />
          <Stat
            label="Total spent"
            value={<Amount value={summary.totalSpent} currency={currency} />}
            hint={`${summary.transactionCount} transaction${summary.transactionCount === 1 ? "" : "s"}`}
          />
          <Stat
            label="Current balance"
            value={<Amount value={summary.currentBalance} currency={currency} />}
            tone={summary.currentBalance < 0 ? "negative" : "default"}
            hint={`As of ${formatDayLabel(summary.asOf)}`}
          />
          <Stat
            label="Extra money in"
            value={<Amount value={funFund} currency={currency} />}
            tone={funFund > 0 ? "positive" : "muted"}
            hint="Carried from earlier months"
          />
          <Stat
            label="Average daily spend"
            value={<Amount value={averageDailySpend} currency={currency} />}
            hint={
              <>
                Allowance <Amount value={summary.dailyAllowance} currency={currency} withDecimals />
              </>
            }
          />
          <Stat
            label="Highest spending day"
            value={
              highestSpendingDay ? (
                <Amount value={highestSpendingDay.amount} currency={currency} />
              ) : (
                "—"
              )
            }
            hint={highestSpendingDay ? formatDayLabel(highestSpendingDay.date) : "Nothing spent yet"}
          />
          <Stat
            label="Largest category"
            value={largestCategory ? largestCategory.name : "—"}
            hint={
              largestCategory ? (
                <>
                  <Amount value={largestCategory.amount} currency={currency} /> ·{" "}
                  {formatPercentage(largestCategory.percentage)}
                </>
              ) : (
                "No expenses recorded"
              )
            }
          />
          <Stat
            label="Projected month end"
            value={<Amount value={summary.projectedEndBalance} currency={currency} />}
            tone={summary.projectedEndBalance < 0 ? "negative" : "default"}
            hint="If nothing more is recorded"
          />
        </dl>
      </CardContent>
    </Card>
  );
}
