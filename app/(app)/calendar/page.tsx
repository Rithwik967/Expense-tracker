"use client";

import * as React from "react";

import { CalendarLegend, MonthCalendar } from "@/components/calendar/month-calendar";
import { DayDetailSheet } from "@/components/calendar/day-detail-sheet";
import { useAppData } from "@/components/providers/app-data-provider";
import { TransactionFormSheet } from "@/components/transactions/transaction-form-sheet";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { Amount } from "@/components/ui/money";
import { ErrorState, Skeleton } from "@/components/ui/states";
import type { TransactionRecord } from "@/lib/data/types";
import type { DateKey } from "@/lib/finance/types";
import { formatDayLabel } from "@/lib/utils/formatting";
import { cn } from "@/lib/utils/cn";

/**
 * Calendar.
 *
 * Each cell renders the daily balance the engine derived for that day; the grid
 * does no arithmetic of its own. Tapping a day opens its full breakdown.
 */
export default function CalendarPage() {
  const { monthView, currency, today } = useAppData();
  const [selected, setSelected] = React.useState<DateKey | null>(null);
  const [sheetDate, setSheetDate] = React.useState<DateKey | null>(null);
  const [editing, setEditing] = React.useState<TransactionRecord | null>(null);
  const [addDate, setAddDate] = React.useState<DateKey | null>(null);

  const view = monthView.data;
  const previewDate = selected ?? today;
  const previewDay = view?.days.find((day) => day.date === previewDate);
  const previewTx = view?.transactions.filter((row) => row.date === previewDate) ?? [];

  return (
    <>
      {monthView.error ? (
        <ErrorState message={monthView.error.message} onRetry={monthView.reload} />
      ) : monthView.isLoading || !view || !today ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <CalendarLegend />

          <MonthCalendar
            days={view.days}
            today={today}
            currency={currency}
            selected={selected}
            onSelect={setSelected}
          />

          {previewDay ? (
            <div className="rounded-2xl bg-surface p-5 shadow-raised">
              <button
                type="button"
                onClick={() => setSheetDate(previewDay.date)}
                className="mb-4 flex w-full items-start justify-between gap-3 text-left"
              >
                <div>
                  <h3 className="mb-1 text-xl font-semibold text-ink">
                    {formatDayLabel(previewDay.date)}
                  </h3>
                  <p className="text-sm text-ink-muted">Daily allowance active</p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1.5 label-caps",
                    previewDay.endingBalance < 0
                      ? "bg-negative-soft text-[#93000a] dark:text-negative"
                      : "bg-positive-soft text-positive",
                  )}
                >
                  <Amount value={previewDay.endingBalance} currency={currency} />
                  {previewDay.endingBalance >= 0 ? " left" : ""}
                </span>
              </button>

              <div className="space-y-3">
                {previewTx.length === 0 ? (
                  <p className="rounded-xl bg-surface-muted p-3 text-sm text-ink-muted">
                    Nothing recorded on this day.
                  </p>
                ) : (
                  previewTx.map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      onSelect={setEditing}
                      className="rounded-xl bg-surface-muted"
                    />
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <DayDetailSheet
        date={sheetDate}
        onClose={() => setSheetDate(null)}
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
    </>
  );
}
