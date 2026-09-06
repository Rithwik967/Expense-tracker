"use client";

import { Ban, Check, Pencil, RotateCcw } from "lucide-react";

import { useAppData } from "@/components/providers/app-data-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Amount } from "@/components/ui/money";
import type { PlannedExpenseRecord } from "@/lib/data/types";
import { PLANNED_STATUS_LABELS } from "@/lib/constants";
import { formatRelativeDayLabel } from "@/lib/utils/formatting";

/**
 * A single plan, with the actions that apply to its current state.
 *
 * "Mark as spent" is the only action with a financial effect: it creates a real
 * expense transaction and links it to the plan, so the plan cannot be spent
 * twice and produce two expenses.
 */
export function PlannedExpenseRow({
  plannedExpense,
  onEdit,
  onComplete,
  onCancel,
  onReopen,
  busy,
}: {
  plannedExpense: PlannedExpenseRecord;
  onEdit: (plan: PlannedExpenseRecord) => void;
  onComplete: (plan: PlannedExpenseRecord) => void;
  onCancel: (plan: PlannedExpenseRecord) => void;
  onReopen: (plan: PlannedExpenseRecord) => void;
  busy?: boolean;
}) {
  const { currency, today, categoryName, categoryIcon } = useAppData();
  const { status } = plannedExpense;

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-muted"
        >
          <CategoryIcon name={categoryIcon(plannedExpense.categoryId)} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate text-sm font-medium text-ink">
              {plannedExpense.description ?? categoryName(plannedExpense.categoryId)}
            </p>
            <p
              className={`tabular shrink-0 text-sm font-semibold ${
                status === "planned" ? "text-ink" : "text-ink-subtle"
              }`}
            >
              <Amount value={plannedExpense.amount} currency={currency} />
            </p>
          </div>

          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
            <span>
              {today
                ? formatRelativeDayLabel(plannedExpense.plannedDate, today)
                : plannedExpense.plannedDate}
            </span>
            <span aria-hidden>·</span>
            <span className="truncate">{categoryName(plannedExpense.categoryId)}</span>
            {status !== "planned" ? (
              <Badge tone={status === "completed" ? "positive" : "neutral"}>
                {PLANNED_STATUS_LABELS[status]}
              </Badge>
            ) : null}
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            {status === "planned" ? (
              <>
                <Button size="sm" onClick={() => onComplete(plannedExpense)} disabled={busy}>
                  <Check aria-hidden />
                  Mark as spent
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(plannedExpense)}
                  disabled={busy}
                >
                  <Pencil aria-hidden />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onCancel(plannedExpense)}
                  disabled={busy}
                >
                  <Ban aria-hidden />
                  Cancel
                </Button>
              </>
            ) : status === "cancelled" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReopen(plannedExpense)}
                disabled={busy}
              >
                <RotateCcw aria-hidden />
                Reopen
              </Button>
            ) : (
              <p className="text-xs text-ink-subtle">
                Recorded as an expense on {plannedExpense.plannedDate}.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
