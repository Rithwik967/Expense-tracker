"use client";

import * as React from "react";

import { ExtraMoneyCard } from "@/components/budget/extra-money-card";
import { AllowanceNotice } from "@/components/dashboard/allowance-notice";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { DayTransactions } from "@/components/dashboard/day-transactions";
import { MonthCard } from "@/components/dashboard/month-card";
import { MonthClosingCard } from "@/components/dashboard/month-closing-card";
import { SafeToSpendCard } from "@/components/dashboard/safe-to-spend-card";
import { TodayCard } from "@/components/dashboard/today-card";
import { PageHeader } from "@/components/layout/page-header";
import { useAppData } from "@/components/providers/app-data-provider";
import { AddTransactionFab } from "@/components/transactions/add-transaction-fab";
import { TransactionFormSheet } from "@/components/transactions/transaction-form-sheet";
import { ErrorState } from "@/components/ui/states";
import type { TransactionRecord } from "@/lib/data/types";
import { formatMonthNameOnly } from "@/lib/utils/formatting";

/**
 * Home.
 *
 * Reads one payload — the month view the provider fetched — and lays out the
 * figures the calculation engine produced. There is no arithmetic on this page:
 * no budget, no allowance and no total is derived here, which is what
 * guarantees Home agrees with Calendar and Insights.
 */
export default function HomePage() {
  const { monthView, month, today, currency, isCurrentMonth } = useAppData();
  const [editing, setEditing] = React.useState<TransactionRecord | null>(null);
  const [addingOpen, setAddingOpen] = React.useState(false);

  const view = monthView.data;

  const todaysTransactions = React.useMemo(
    () => (view && today ? view.transactions.filter((row) => row.date === today) : []),
    [view, today],
  );

  return (
    <>
      <PageHeader title="Overview" withMonthSwitcher />

      {monthView.error ? (
        <ErrorState
          message={monthView.error.message}
          onRetry={monthView.reload}
        />
      ) : monthView.isLoading || !view || !month ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-3">
          <AllowanceNotice summary={view.summary} currency={currency} />

          {isCurrentMonth && view.todayBalance && view.startOfDayAvailable !== null ? (
            <TodayCard
              balance={view.todayBalance}
              startOfDayAvailable={view.startOfDayAvailable}
              currency={currency}
            />
          ) : (
            <MonthClosingCard summary={view.summary} currency={currency} />
          )}

          {view.safeToSpend && view.safeToSpend.plannedExpenseCount > 0 ? (
            <SafeToSpendCard safeToSpend={view.safeToSpend} currency={currency} />
          ) : null}

          <MonthCard summary={view.summary} currency={currency} />

          <ExtraMoneyCard
            month={view.month}
            funFund={view.funFund}
            carryForward={view.summary.carryForward}
            history={view.carryForwardHistory}
            currency={currency}
          />

          {isCurrentMonth ? (
            <DayTransactions
              title="Today"
              transactions={todaysTransactions}
              emptyTitle="Nothing recorded today"
              emptyDescription="Add an expense as it happens and today's balance updates straight away."
              onSelect={setEditing}
              onAdd={() => setAddingOpen(true)}
              seeAllHref="/transactions"
            />
          ) : (
            <DayTransactions
              title={`Latest in ${formatMonthNameOnly(view.month)}`}
              transactions={view.transactions.slice(0, 5)}
              emptyTitle="No transactions this month"
              emptyDescription="Nothing was recorded in this month."
              onSelect={setEditing}
              seeAllHref="/transactions"
            />
          )}
        </div>
      )}

      <AddTransactionFab initialDate={today ?? undefined} />

      <TransactionFormSheet
        open={addingOpen}
        onClose={() => setAddingOpen(false)}
        initialDate={today ?? undefined}
      />

      <TransactionFormSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        transaction={editing}
      />
    </>
  );
}
