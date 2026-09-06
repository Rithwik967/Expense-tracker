"use client";

import { useAppData } from "@/components/providers/app-data-provider";
import { useMutation } from "@/hooks/use-mutation";
import { useReloadOnChange, useResource, type Resource } from "@/hooks/use-resource";
import { api } from "@/lib/api/client";
import type { PlannedExpenseRecord } from "@/lib/data/types";
import type { DateKey, PlannedExpenseStatus } from "@/lib/finance/types";

/**
 * Planned expenses.
 *
 * A plan is an intention, not spending: it never touches a balance. Its only
 * financial effect is to reduce safe-to-spend, which the engine computes as a
 * reservation. Marking one as spent creates a real expense transaction, and the
 * plan then carries that transaction's id so it cannot be spent twice.
 */
export interface PlannedExpensesResult {
  readonly plannedExpenses: readonly PlannedExpenseRecord[];
  readonly resource: Resource<{ plannedExpenses: PlannedExpenseRecord[] }>;
}

export function usePlannedExpenses(
  filter: { from?: DateKey; to?: DateKey; statuses?: readonly PlannedExpenseStatus[] } = {},
): PlannedExpensesResult {
  const { revision } = useAppData();

  const query = {
    from: filter.from,
    to: filter.to,
    statuses: filter.statuses?.length ? filter.statuses.join(",") : undefined,
  };
  const key = `planned:${JSON.stringify(query)}`;

  const resource = useResource<{ plannedExpenses: PlannedExpenseRecord[] }>(key, () =>
    api.plannedExpenses(query),
  );
  useReloadOnChange(resource.reload, revision);

  return { plannedExpenses: resource.data?.plannedExpenses ?? [], resource };
}

export function usePlannedExpenseActions() {
  const { refresh } = useAppData();

  const create = useMutation(async (body: unknown) => {
    const created = await api.createPlannedExpense(body);
    refresh();
    return created;
  });

  const update = useMutation(async (id: string, body: unknown) => {
    const updated = await api.updatePlannedExpense(id, body);
    refresh();
    return updated;
  });

  const remove = useMutation(async (id: string) => {
    const result = await api.deletePlannedExpense(id);
    refresh();
    return result;
  });

  const complete = useMutation(async (id: string, date?: DateKey) => {
    const result = await api.completePlannedExpense(id, date);
    refresh();
    return result;
  });

  return { create, update, remove, complete };
}
