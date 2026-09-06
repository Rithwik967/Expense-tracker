"use client";

import * as React from "react";

import { useAppData } from "@/components/providers/app-data-provider";
import { useMutation } from "@/hooks/use-mutation";
import { useReloadOnChange, useResource, type Resource } from "@/hooks/use-resource";
import { api } from "@/lib/api/client";
import type { MonthlyBudgetRecord } from "@/lib/data/types";
import type { MonthKey } from "@/lib/finance/types";

/**
 * Budget configuration: the per-month rows and the global defaults.
 *
 * Saving a budget rewrites configuration only. No transaction is touched and no
 * balance is stored, so a month whose budget changes is simply recalculated the
 * next time it is read — including months in the past, which is why the UI
 * warns before changing one.
 */
export interface BudgetResult {
  readonly budgets: readonly MonthlyBudgetRecord[];
  /** The row for `month`, or `undefined` when it falls back to the defaults. */
  budgetFor: (month: MonthKey) => MonthlyBudgetRecord | undefined;
  readonly resource: Resource<{ budgets: MonthlyBudgetRecord[] }>;
  readonly saveBudget: ReturnType<typeof useSaveBudget>;
  readonly saveSettings: ReturnType<typeof useSaveSettings>;
}

export function useBudget(): BudgetResult {
  const { revision } = useAppData();

  const resource = useResource<{ budgets: MonthlyBudgetRecord[] }>("budgets", api.budgets);
  useReloadOnChange(resource.reload, revision);

  const budgets = resource.data?.budgets ?? [];
  const byMonth = React.useMemo(
    () => new Map(budgets.map((budget) => [budget.monthStart, budget])),
    [budgets],
  );

  const budgetFor = React.useCallback(
    (month: MonthKey) => byMonth.get(month),
    [byMonth],
  );

  return {
    budgets,
    budgetFor,
    resource,
    saveBudget: useSaveBudget(),
    saveSettings: useSaveSettings(),
  };
}

export function useSaveBudget() {
  const { refresh } = useAppData();

  return useMutation(async (input: { monthStart: MonthKey; monthlyBudget: string; dailyAllowance: string | null }) => {
    const saved = await api.saveBudget(input);
    refresh();
    return saved;
  });
}

export function useSaveSettings() {
  const { refresh } = useAppData();

  return useMutation(
    async (patch: {
      currency?: string;
      defaultMonthlyBudget?: string;
      defaultDailyAllowance?: string | null;
      monthStartDay?: number;
    }) => {
      const saved = await api.updateSettings(patch);
      refresh();
      return saved;
    },
  );
}
