"use client";

import { CalendarClock, Plus } from "lucide-react";
import * as React from "react";

import { ListSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { SafeToSpendCard } from "@/components/dashboard/safe-to-spend-card";
import { PageHeader } from "@/components/layout/page-header";
import { PlannedExpenseFormSheet } from "@/components/planned/planned-expense-form-sheet";
import { PlannedExpenseRow } from "@/components/planned/planned-expense-row";
import { useAppData } from "@/components/providers/app-data-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { usePlannedExpenseActions, usePlannedExpenses } from "@/hooks/use-planned-expenses";
import type { PlannedExpenseRecord } from "@/lib/data/types";
import { lastDayOfMonth } from "@/lib/utils/dates";
import { formatMonthLabel } from "@/lib/utils/formatting";

/**
 * Planned expenses.
 *
 * The screen makes the reservation model explicit: available balance, minus
 * what is reserved, equals safe to spend. Nothing here alters a balance until a
 * plan is marked as spent, at which point it becomes an ordinary expense
 * transaction like any other.
 */
export default function PlannedPage() {
  const { month, monthView, currency, today } = useAppData();
  const toast = useToast();

  const range = month ? { from: month, to: lastDayOfMonth(month) } : {};
  const { plannedExpenses, resource } = usePlannedExpenses(range);
  const { update, complete } = usePlannedExpenseActions();

  const [editing, setEditing] = React.useState<PlannedExpenseRecord | null>(null);
  const [adding, setAdding] = React.useState(false);

  const groups = React.useMemo(() => {
    const upcoming = plannedExpenses.filter((plan) => plan.status === "planned");
    const done = plannedExpenses.filter((plan) => plan.status === "completed");
    const cancelled = plannedExpenses.filter((plan) => plan.status === "cancelled");
    return { upcoming, done, cancelled };
  }, [plannedExpenses]);

  const busy = update.isPending || complete.isPending;

  const onComplete = async (plan: PlannedExpenseRecord) => {
    const result = await complete.run(plan.id);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Recorded as an expense.");
  };

  const onCancel = async (plan: PlannedExpenseRecord) => {
    const result = await update.run(plan.id, { status: "cancelled" });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Plan cancelled.");
  };

  const onReopen = async (plan: PlannedExpenseRecord) => {
    const result = await update.run(plan.id, { status: "planned" });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Plan reopened.");
  };

  const safeToSpend = monthView.data?.safeToSpend ?? null;

  return (
    <>
      <PageHeader
        title="Planned"
        description={month ? `Reservations for ${formatMonthLabel(month)}.` : undefined}
        withMonthSwitcher
        action={
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden />
            Plan
          </Button>
        }
      />

      <div className="space-y-3">
        {safeToSpend ? <SafeToSpendCard safeToSpend={safeToSpend} currency={currency} /> : null}

        {resource.error ? (
          <ErrorState message={resource.error.message} onRetry={resource.reload} />
        ) : resource.isLoading ? (
          <ListSkeleton rows={3} />
        ) : plannedExpenses.length === 0 ? (
          <Card>
            <EmptyState
              icon={CalendarClock}
              title="No planned expenses"
              description="Plan something you know is coming and it will be held back from safe-to-spend without changing your balance."
              action={
                <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
                  <Plus aria-hidden />
                  Plan an expense
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            <PlanGroup
              title="Upcoming"
              plans={groups.upcoming}
              emptyMessage="Nothing reserved for the rest of this month."
              onEdit={setEditing}
              onComplete={onComplete}
              onCancel={onCancel}
              onReopen={onReopen}
              busy={busy}
            />

            {groups.done.length > 0 ? (
              <PlanGroup
                title="Marked as spent"
                plans={groups.done}
                onEdit={setEditing}
                onComplete={onComplete}
                onCancel={onCancel}
                onReopen={onReopen}
                busy={busy}
              />
            ) : null}

            {groups.cancelled.length > 0 ? (
              <PlanGroup
                title="Cancelled"
                plans={groups.cancelled}
                onEdit={setEditing}
                onComplete={onComplete}
                onCancel={onCancel}
                onReopen={onReopen}
                busy={busy}
              />
            ) : null}
          </>
        )}
      </div>

      <PlannedExpenseFormSheet
        open={adding}
        onClose={() => setAdding(false)}
        initialDate={today ?? undefined}
      />

      <PlannedExpenseFormSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        plannedExpense={editing}
      />
    </>
  );
}

function PlanGroup({
  title,
  plans,
  emptyMessage,
  onEdit,
  onComplete,
  onCancel,
  onReopen,
  busy,
}: {
  title: string;
  plans: readonly PlannedExpenseRecord[];
  emptyMessage?: string;
  onEdit: (plan: PlannedExpenseRecord) => void;
  onComplete: (plan: PlannedExpenseRecord) => Promise<void>;
  onCancel: (plan: PlannedExpenseRecord) => Promise<void>;
  onReopen: (plan: PlannedExpenseRecord) => Promise<void>;
  busy: boolean;
}) {
  if (plans.length === 0 && !emptyMessage) return null;

  return (
    <section>
      <h2 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {title}
      </h2>
      <Card className="divide-y divide-border overflow-hidden">
        {plans.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-muted">{emptyMessage}</p>
        ) : (
          plans.map((plan) => (
            <PlannedExpenseRow
              key={plan.id}
              plannedExpense={plan}
              onEdit={onEdit}
              onComplete={(selected) => void onComplete(selected)}
              onCancel={(selected) => void onCancel(selected)}
              onReopen={(selected) => void onReopen(selected)}
              busy={busy}
            />
          ))
        )}
      </Card>
    </section>
  );
}
