"use client";

import { ChartColumn, PartyPopper } from "lucide-react";
import * as React from "react";

import { BalanceChart } from "@/components/insights/balance-chart";
import { CategoryBreakdown } from "@/components/insights/category-breakdown";
import { ChartCard } from "@/components/insights/chart-frame";
import { InsightHeadline } from "@/components/insights/insight-headline";
import { OverviewGrid } from "@/components/insights/overview-grid";
import {
  SpendingChart,
  SpendingChartToggle,
  type SpendingChartMode,
} from "@/components/insights/spending-chart";
import { WeeklyAnalysis } from "@/components/insights/weekly-analysis";
import { useAppData } from "@/components/providers/app-data-provider";
import { Amount } from "@/components/ui/money";
import { Progress } from "@/components/ui/progress";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useInsights } from "@/hooks/use-insights";
import { getRemainingBudget } from "@/lib/finance/monthly-balance";
import { fromMinor, toMajorNumber } from "@/lib/finance/money";
import { formatMonthLabel } from "@/lib/utils/formatting";

/**
 * Insights.
 *
 * Everything on this screen is a reshaping of the month payload the provider
 * already fetched — the same one Home and Calendar render.
 */
export default function InsightsPage() {
  const { currency, month } = useAppData();
  const insights = useInsights();
  const [mode, setMode] = React.useState<SpendingChartMode>("daily");

  const { resource, summary } = insights;
  const hasExpenses = insights.categories.length > 0;
  const remaining = summary ? getRemainingBudget(summary) : fromMinor(0);
  const spentRatio =
    summary && summary.monthlyBudget > 0
      ? Math.round((summary.totalSpent / summary.monthlyBudget) * 100)
      : 0;

  return (
    <>
      {resource.error ? (
        <ErrorState message={resource.error.message} onRetry={resource.reload} />
      ) : resource.isLoading || !summary ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-2xl bg-surface-muted p-6 shadow-card">
            <div className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-brand/5 blur-2xl" />
            <p className="label-caps relative z-10 text-ink-subtle">
              {month ? `${formatMonthLabel(month)} Overview` : "Overview"}
            </p>
            <p className="relative z-10 mt-1 flex items-end gap-2">
              <span className="tabular text-[32px] font-bold leading-10 text-brand">
                <Amount value={summary.totalSpent} currency={currency} />
              </span>
              <span className="mb-1 text-base text-ink-muted">
                / <Amount value={summary.monthlyBudget} currency={currency} />
              </span>
            </p>
            <Progress
              value={summary.totalSpent}
              max={summary.monthlyBudget}
              label={`${spentRatio}% spent`}
              className="relative z-10 mt-3 h-2"
            />
            <div className="relative z-10 mt-1 flex items-center justify-between text-sm text-ink-muted">
              <span>{spentRatio}% spent</span>
              <span className="font-medium text-positive">
                <Amount value={remaining} currency={currency} /> left
              </span>
            </div>
          </div>

          <InsightHeadline headline={insights.headline} />

          <ChartCard title="Balance Over Time">
            <BalanceChart data={insights.balance} currency={currency} />
          </ChartCard>

          <div className="flex items-center gap-4 rounded-2xl bg-positive-soft p-4 text-positive shadow-md">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/30">
              <PartyPopper className="size-7" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 text-base font-bold">
                Fun Potential: <Amount value={insights.funFund ?? summary.extraMoney} currency={currency} />
              </h3>
              <p className="text-sm leading-snug opacity-90">
                Accumulated surplus carried in from earlier months. Already part of your available
                balance.
              </p>
            </div>
          </div>

          <ChartCard title="Category Breakdown">
            {hasExpenses ? (
              <CategoryBreakdown categories={insights.categories} currency={currency} />
            ) : (
              <EmptyState
                icon={ChartColumn}
                title="No categories to compare"
                description="Category shares appear once you have recorded an expense."
              />
            )}
          </ChartCard>

          <ChartCard
            title="Spending"
            caption={
              mode === "daily"
                ? "Each day against your daily allowance."
                : "Spending so far against allowance accrued so far."
            }
            action={<SpendingChartToggle mode={mode} onChange={setMode} />}
          >
            {hasExpenses ? (
              <SpendingChart
                data={insights.spending}
                mode={mode}
                currency={currency}
                dailyAllowance={toMajorNumber(summary.dailyAllowance)}
              />
            ) : (
              <EmptyState
                icon={ChartColumn}
                title="No spending recorded yet"
                description={`Nothing has been spent in ${month ? formatMonthLabel(month) : "this month"}, so there is nothing to chart.`}
              />
            )}
          </ChartCard>

          <section>
            <h2 className="mb-2 px-1 text-xl font-semibold text-ink">Weekly Analysis</h2>
            <WeeklyAnalysis weeks={insights.weeks} currency={currency} />
          </section>

          <div className="lg:block hidden">
            <OverviewGrid
              summary={summary}
              averageDailySpend={insights.averageDailySpend ?? summary.totalSpent}
              highestSpendingDay={insights.highestSpendingDay}
              largestCategory={insights.largestCategory}
              funFund={insights.funFund ?? summary.extraMoney}
              currency={currency}
            />
          </div>
        </div>
      )}
    </>
  );
}
