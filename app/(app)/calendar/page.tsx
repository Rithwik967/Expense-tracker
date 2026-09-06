"use client";

import * as React from "react";

import { DayDetailSheet } from "@/components/calendar/day-detail-sheet";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { PageHeader } from "@/components/layout/page-header";
import { useAppData } from "@/components/providers/app-data-provider";
import { AddTransactionFab } from "@/components/transactions/add-transaction-fab";
import { TransactionFormSheet } from "@/components/transactions/transaction-form-sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Amount } from "@/components/ui/money";
import { ErrorState, Skeleton } from "@/components/ui/states";
import type { TransactionRecord } from "@/lib/data/types";
import type { DateKey } from "@/lib/finance/types";

/**
 * Calendar.
 *
 * Each cell renders the daily balance the engine derived for that day; the grid
 * does no arithmetic of its own. Tapping a day opens its full breakdown.
 */
export default function CalendarPage() {
  const { monthView, currency, today } = useAppData();
  const [selected, setSelected] = React.useState<DateKey | null>(null);
  const [editing, setEditing] = React.useState<TransactionRecord | null>(null);
  const [addDate, setAddDate] = React.useState<DateKey | null>(null);

  const view = monthView.data;

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Every day's closing balance, derived from your transactions."
        withMonthSwitcher
      />

      {monthView.error ? (
        <ErrorState message={monthView.error.message} onRetry={monthView.reload} />
      ) : monthView.isLoading || !view || !today ? (
        <Card>
          <CardContent className="space-y-2" aria-busy="true">
            <Skeleton className="h-4 w-28" />
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }, (_, index) => (
                <Skeleton key={index} className="h-[58px]" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <Card>
            <CardContent>
              <MonthCalendar
                days={view.days}
                today={today}
                currency={currency}
                selected={selected}
                onSelect={setSelected}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <dl className="grid grid-cols-3 gap-3">
                <div className="min-w-0">
                  <dt className="truncate text-xs text-ink-muted">Spent this month</dt>
                  <dd className="tabular mt-0.5 text-sm font-semibold text-ink">
                    <Amount value={view.summary.totalSpent} currency={currency} />
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="truncate text-xs text-ink-muted">Days over allowance</dt>
                  <dd className="tabular mt-0.5 text-sm font-semibold text-ink">
                    {view.days.filter((day) => day.totalSpent > day.dailyAllowance).length}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="truncate text-xs text-ink-muted">Days below zero</dt>
                  <dd className="tabular mt-0.5 text-sm font-semibold text-ink">
                    {view.days.filter((day) => day.endingBalance < 0).length}
                  </dd>
                </div>
              </dl>

              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-ink-subtle">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="size-2 rounded-full bg-positive" />
                  Closed in credit
                </span>
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="size-2 rounded-full bg-negative" />
                  Closed below zero
                </span>
                <span>Faded days have not happened yet.</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <DayDetailSheet
        date={selected}
        onClose={() => setSelected(null)}
        onEditTransaction={setEditing}
        onAddOnDate={setAddDate}
      />

      <TransactionFormSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        transaction={editing}
      />

      <TransactionFormSheet
        open={addDate !== null}
        onClose={() => setAddDate(null)}
        initialDate={addDate ?? undefined}
      />

      <AddTransactionFab initialDate={today ?? undefined} />
    </>
  );
}
