"use client";

import * as React from "react";

import { useAppData } from "@/components/providers/app-data-provider";
import type { Resource } from "@/hooks/use-resource";
import { CATEGORY_CHART_COLORS } from "@/lib/constants";
import { ZERO, add, toMajorNumber, type Money } from "@/lib/finance/money";
import { getSpendingVarianceRatio } from "@/lib/finance/projections";
import type { CategoryTotal, DateKey, MonthlySummary, WeeklyBreakdown } from "@/lib/finance/types";
import type { MonthProjection } from "@/lib/finance/projections";
import { formatChartDate } from "@/lib/utils/formatting";
import type { MonthView } from "@/types/app";

/**
 * Analytics for the selected month.
 *
 * Every figure is read from the month payload the provider already fetched —
 * the same payload Home and Calendar render — so Insights cannot report a
 * different total from the rest of the app. Nothing here recomputes a balance;
 * the series are reshapings of what `lib/finance` produced.
 *
 * Charts need plain numbers, so amounts are converted to major units at this
 * boundary and only for plotting. Every label still formats from the original
 * `Money`, which is what keeps the axis and the caption in agreement.
 */

export interface SpendingPoint {
  readonly date: DateKey;
  readonly label: string;
  readonly spent: number;
  readonly cumulative: number;
  readonly allowance: number;
  readonly isFuture: boolean;
}

export interface BalancePoint {
  readonly date: DateKey;
  readonly label: string;
  readonly balance: number;
  readonly isFuture: boolean;
}

export interface CategorySlice extends CategoryTotal {
  readonly name: string;
  readonly color: string;
}

export type InsightTone = "empty" | "low-data" | "normal" | "overspending" | "strong-saving";

export interface InsightHeadline {
  readonly tone: InsightTone;
  readonly message: string;
}

export interface InsightsResult {
  readonly resource: Resource<MonthView>;
  readonly summary: MonthlySummary | null;
  readonly projection: MonthProjection | null;
  readonly spending: readonly SpendingPoint[];
  readonly balance: readonly BalancePoint[];
  readonly categories: readonly CategorySlice[];
  readonly weeks: readonly WeeklyBreakdown[];
  readonly averageDailySpend: Money | null;
  readonly highestSpendingDay: { date: DateKey; amount: Money } | null;
  readonly largestCategory: CategorySlice | null;
  readonly funFund: Money | null;
  readonly headline: InsightHeadline;
  /** Days with at least one expense. Drives the "not much to go on yet" state. */
  readonly daysWithSpending: number;
}

const EMPTY_HEADLINE: InsightHeadline = {
  tone: "empty",
  message: "No spending recorded yet.",
};

export function useInsights(): InsightsResult {
  const { monthView, categoryName } = useAppData();
  const view = monthView.data;

  const spending = React.useMemo<SpendingPoint[]>(() => {
    if (!view) return [];

    let running = ZERO;
    return view.days.map((day) => {
      running = add(running, day.totalSpent);
      return {
        date: day.date,
        label: formatChartDate(day.date),
        spent: toMajorNumber(day.totalSpent),
        cumulative: toMajorNumber(running),
        allowance: toMajorNumber(day.dailyAllowance),
        isFuture: day.date > view.today,
      };
    });
  }, [view]);

  const balance = React.useMemo<BalancePoint[]>(() => {
    if (!view) return [];

    return view.days.map((day) => ({
      date: day.date,
      label: formatChartDate(day.date),
      balance: toMajorNumber(day.endingBalance),
      isFuture: day.date > view.today,
    }));
  }, [view]);

  const categories = React.useMemo<CategorySlice[]>(() => {
    if (!view) return [];

    return view.categoryTotals.map((total, index) => ({
      ...total,
      name: categoryName(total.categoryId),
      color: CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length],
    }));
  }, [view, categoryName]);

  const daysWithSpending = React.useMemo(
    () => (view ? view.days.filter((day) => day.totalSpent > 0).length : 0),
    [view],
  );

  const headline = React.useMemo<InsightHeadline>(() => {
    if (!view) return EMPTY_HEADLINE;

    const { summary } = view;
    if (summary.totalSpent === 0 && summary.totalIncome === 0) return EMPTY_HEADLINE;

    if (summary.currentBalance < 0) {
      return {
        tone: "overspending",
        message: "You are currently using future allowance. Daily allowance will recover it.",
      };
    }

    if (daysWithSpending < 3) {
      return {
        tone: "low-data",
        message: "Only a couple of days recorded so far — trends will firm up as the month goes on.",
      };
    }

    const variance = getSpendingVarianceRatio(summary.totalSpent, summary.allowanceAccruedToDate);
    if (variance === null) {
      return { tone: "normal", message: "Tracking your spending against this month's allowance." };
    }

    const rounded = Math.round(Math.abs(variance));
    if (variance >= 15) {
      return {
        tone: "strong-saving",
        message: `You've spent ${rounded}% less than your allowance so far this month.`,
      };
    }
    if (variance <= -10) {
      return {
        tone: "overspending",
        message: `You've spent ${rounded}% more than the allowance generated so far this month.`,
      };
    }

    return {
      tone: "normal",
      message: "Your spending is tracking close to your daily allowance.",
    };
  }, [view, daysWithSpending]);

  return {
    resource: monthView,
    summary: view?.summary ?? null,
    projection: view?.projection ?? null,
    spending,
    balance,
    categories,
    weeks: view?.weeks ?? [],
    averageDailySpend: view?.averageDailySpend ?? null,
    highestSpendingDay: view?.highestSpendingDay ?? null,
    largestCategory: categories[0] ?? null,
    funFund: view?.funFund ?? null,
    headline,
    daysWithSpending,
  };
}
