"use client";

import { ChartColumn } from "lucide-react";
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
import { PageHeader } from "@/components/layout/page-header";
import { useAppData } from "@/components/providers/app-data-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Amount } from "@/components/ui/money";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useInsights } from "@/hooks/use-insights";
import { toMajorNumber } from "@/lib/finance/money";
import { formatMonthLabel } from "@/lib/utils/formatting";

/**
 * Insights.
 *
 * Everything on this screen is a reshaping of the month payload the provider
 * already fetched — the same one Home and Calendar render. No total is
 * recomputed here, which is the only way "Insights says ₹7,420" and "Home says
 * ₹7,420" can be guaranteed rather than hoped for.
 */
export default function InsightsPage() {
  const { currency, month } = useAppData();
  const insights = useInsights();
  const [mode, setMode] = React.useState<SpendingChartMode>("daily");

  const { resource, summary } = insights;
  const hasExpenses = insights.categories.length > 0;

  return (
    <>
      <PageHeader
        title="Insights"
        description="How this month is tracking against your allowance."
        withMonthSwitcher
      />

      {resource.error ? (
        <ErrorState message={resource.error.message} onRetry={resource.reload} />
      ) : resource.isLoading || !summary ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-14 w-full rounded-card" />
          <Skeleton className="h-44 w-full rounded-card" />
          <Skeleton className="h-64 w-full rounded-card" />
          <Skeleton className="h-64 w-full rounded-card" />
        </div>
      ) : (
        <div className="space-y-3">
          <InsightHeadline headline={insights.headline} />

          <OverviewGrid
            summary={summary}
            averageDailySpend={insights.averageDailySpend ?? summary.totalSpent}
            highestSpendingDay={insights.highestSpendingDay}
            largestCategory={insights.largestCategory}
            funFund={insights.funFund ?? summary.extraMoney}
            currency={currency}
          />

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

          <ChartCard
            title="Available balance"
            caption="Your running balance, including days still to come."
          >
            <BalanceChart data={insights.balance} currency={currency} />
          </ChartCard>

          <ChartCard title="Where it went" caption="Expenses by category, largest first.">
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

          <ChartCard title="By week" caption="Allowance generated against what was spent.">
            <WeeklyAnalysis weeks={insights.weeks} currency={currency} />
          </ChartCard>

          <Card>
            <CardContent className="space-y-1">
              <p className="text-xs font-medium text-ink-muted">Fun Fund</p>
              <p className="tabular text-2xl font-semibold text-ink">
                <Amount value={insights.funFund ?? summary.extraMoney} currency={currency} />
              </p>
              <p className="text-xs text-ink-subtle">
                Accumulated surplus carried in from earlier months. It is already part of your
                available balance — spending it is an ordinary expense, not a withdrawal from a
                separate pot.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
