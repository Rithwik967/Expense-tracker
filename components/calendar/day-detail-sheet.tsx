"use client";

import { CalendarClock, Plus, Receipt } from "lucide-react";
import * as React from "react";

import { useAppData } from "@/components/providers/app-data-provider";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Amount } from "@/components/ui/money";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useDailyBalance } from "@/hooks/use-daily-balance";
import type { TransactionRecord } from "@/lib/data/types";
import { fromMinor } from "@/lib/finance/money";
import type { DateKey } from "@/lib/finance/types";
import { formatDayLabel, formatRelativeDayLabel } from "@/lib/utils/formatting";

/**
 * One day, in full.
 *
 * Reads `getDailyBalance` for the date rather than reusing the month grid's
 * copy, so the breakdown is a single authoritative statement of that day:
 * starting balance, allowance, what came in, what went out, closing balance.
 * The lines are ordered the way the arithmetic runs, so the closing figure can
 * be followed rather than taken on trust.
 */
export function DayDetailSheet({
  date,
  onClose,
  onEditTransaction,
  onAddOnDate,
}: {
  date: DateKey | null;
  onClose: () => void;
  onEditTransaction: (transaction: TransactionRecord) => void;
  onAddOnDate: (date: DateKey) => void;
}) {
  const { currency, today } = useAppData();
  const resource = useDailyBalance(date);
  const view = resource.data;

  return (
    <Sheet
      open={date !== null}
      onClose={onClose}
      title={date && today ? formatRelativeDayLabel(date, today) : "Day"}
      description={date ? formatDayLabel(date) : undefined}
      footer={
        date ? (
          <Button
            block
            onClick={() => {
              onAddOnDate(date);
              onClose();
            }}
          >
            <Plus aria-hidden />
            Add on this day
          </Button>
        ) : undefined
      }
    >
      {resource.error ? (
        <ErrorState message={resource.error.message} onRetry={resource.reload} />
      ) : resource.isLoading || !view ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Skeleton key={index} className="h-6 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          <dl className="space-y-2 text-sm">
            <Line label="Started with" value={<Amount value={view.balance.startingBalance} currency={currency} />} />
            <Line
              label="Daily allowance"
              value={<Amount value={view.balance.dailyAllowance} currency={currency} signed withDecimals />}
              tone="positive"
            />
            {view.balance.income > 0 ? (
              <Line
                label="Money added"
                value={<Amount value={view.balance.income} currency={currency} signed />}
                tone="positive"
              />
            ) : null}
            {view.balance.creditAdjustments > 0 ? (
              <Line
                label="Adjustments in"
                value={<Amount value={view.balance.creditAdjustments} currency={currency} signed />}
                tone="positive"
              />
            ) : null}
            {view.balance.expenses > 0 ? (
              <Line
                label="Spent"
                value={<>−<Amount value={view.balance.expenses} currency={currency} /></>}
              />
            ) : null}
            {view.balance.debitAdjustments > 0 ? (
              <Line
                label="Adjustments out"
                value={<>−<Amount value={view.balance.debitAdjustments} currency={currency} /></>}
              />
            ) : null}

            <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
              <dt className="text-sm font-semibold text-ink">Ended with</dt>
              <dd
                className={`tabular text-base font-semibold ${
                  view.balance.endingBalance < 0 ? "text-negative" : "text-ink"
                }`}
              >
                <Amount value={view.balance.endingBalance} currency={currency} />
              </dd>
            </div>
          </dl>

          <section>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
              Transactions
            </h3>
            {view.transactions.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Nothing recorded"
                description="This day only has its daily allowance."
                className="py-6"
              />
            ) : (
              <div className="-mx-4 divide-y divide-border border-y border-border">
                {view.transactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    onSelect={(selected) => {
                      onClose();
                      onEditTransaction(selected);
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          {view.plannedExpenses.length > 0 ? (
            <section>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
                <CalendarClock className="size-3.5" aria-hidden />
                Planned
              </h3>
              <ul className="space-y-1.5">
                {view.plannedExpenses.map((planned) => (
                  <li
                    key={planned.id}
                    className="flex items-center justify-between gap-3 rounded-control bg-surface-muted px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {planned.description ?? "Planned expense"}
                    </span>
                    <Badge tone={planned.status === "planned" ? "info" : "neutral"}>
                      {planned.status}
                    </Badge>
                    <span className="tabular shrink-0 font-medium text-ink">
                      <Amount value={planned.amount} currency={currency} />
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-ink-subtle">
                Plans are reservations. They do not change the balance above until you mark one as
                spent.
              </p>
            </section>
          ) : null}

          {view.balance.transactionCount > 0 ? (
            <p className="text-xs text-ink-subtle">
              {view.balance.transactionCount} transaction
              {view.balance.transactionCount === 1 ? "" : "s"} on this day, spending{" "}
              <Amount value={fromMinor(view.balance.totalSpent)} currency={currency} />.
            </p>
          ) : null}
        </div>
      )}
    </Sheet>
  );
}

function Line({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "positive";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={`tabular font-medium ${tone === "positive" ? "text-positive" : "text-ink"}`}>
        {value}
      </dd>
    </div>
  );
}
