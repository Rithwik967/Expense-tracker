"use client";

import { useAppData } from "@/components/providers/app-data-provider";
import type { Resource } from "@/hooks/use-resource";
import { getRemainingBudget, getTotalAvailableForMonth } from "@/lib/finance/monthly-balance";
import { ZERO, type Money } from "@/lib/finance/money";
import type { MonthlySummary } from "@/lib/finance/types";
import type { MonthView } from "@/types/app";

/**
 * The month's headline figures.
 *
 * A selector over the one month request the provider already made, not a second
 * fetch. Everything returned was computed by `lib/finance` on the server, so
 * Home, Calendar and Insights are reading the same numbers rather than three
 * independently derived ones.
 */
export interface MonthlySummaryResult {
  readonly summary: MonthlySummary | null;
  readonly monthView: MonthView | null;
  /** Allowance for the whole month plus anything carried in, less spending. */
  readonly remainingBudget: Money;
  /** Budget for the month plus positive carry-forward. */
  readonly totalAvailable: Money;
  readonly resource: Resource<MonthView>;
}

export function useMonthlySummary(): MonthlySummaryResult {
  const { monthView } = useAppData();
  const view = monthView.data;
  const summary = view?.summary ?? null;

  return {
    summary,
    monthView: view,
    remainingBudget: summary ? getRemainingBudget(summary) : ZERO,
    totalAvailable: summary ? getTotalAvailableForMonth(summary) : ZERO,
    resource: monthView,
  };
}
