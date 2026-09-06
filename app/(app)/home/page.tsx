"use client";

import * as React from "react";

import { ExtraMoneyCard } from "@/components/budget/extra-money-card";
import { AllowanceNotice } from "@/components/dashboard/allowance-notice";
import { BalanceExplanation } from "@/components/dashboard/balance-explanation";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { DayTransactions } from "@/components/dashboard/day-transactions";
import { MonthCard } from "@/components/dashboard/month-card";
import { MonthClosingCard } from "@/components/dashboard/month-closing-card";
import { SafeToSpendCard } from "@/components/dashboard/safe-to-spend-card";
import { TodayCard } from "@/components/dashboard/today-card";
import { useAppData } from "@/components/providers/app-data-provider";
import { useAddTransaction } from "@/components/transactions/add-transaction-fab";
import { TransactionFormSheet } from "@/components/transactions/transaction-form-sheet";
import { ErrorState } from "@/components/ui/states";
import type { TransactionRecord } from "@/lib/data/types";
import { formatMonthNameOnly } from "@/lib/utils/formatting";

/**
 * Home.
 *
 * Reads one payload — the month view the provider fetched — and lays out the
 * figures the calculation engine produced. There is no arithmetic on this page.
 */
export default function HomePage() {
  const { monthView, month, today, currency, isCurrentMonth } = useAppData();
  const { openExpense } = useAddTransaction();
  const [editing, setEditing] = React.useState<TransactionRecord | null>(null);

  const view = monthView.data;

  const todaysTransactions = React.useMemo(
    () => (view && today ? view.transactions.filter((row) => row.date === today) : []),
    [view, today],
  );

  return (
    <>
      {monthView.error ? (
        <ErrorState
          message={monthView.error.message}
          onRetry={monthView.reload}
        />
      ) : monthView.isLoading || !view || !month ? (
        <DashboardSkeleton />
      ) : (
        <div className="flex flex-col gap-6 pb-2">
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

          <MonthCard summary={view.summary} currency={currency} />

          {isCurrentMonth ? (
            <DayTransactions
              title="Today's Transactions"
              transactions={todaysTransactions}
              emptyTitle="Nothing recorded today"
              emptyDescription="Add an expense as it happens and today's balance updates straight away."
              onSelect={setEditing}
              onAdd={openExpense}
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

          {isCurrentMonth && view.todayBalance && view.startOfDayAvailable !== null ? (
            <BalanceExplanation
              balance={view.todayBalance}
              startOfDayAvailable={view.startOfDayAvailable}
              currency={currency}
            />
          ) : null}

          {view.safeToSpend && view.safeToSpend.plannedExpenseCount > 0 ? (
            <SafeToSpendCard safeToSpend={view.safeToSpend} currency={currency} />
          ) : null}

          <ExtraMoneyCard
            month={view.month}
            funFund={view.funFund}
            carryForward={view.summary.carryForward}
            history={view.carryForwardHistory}
            currency={currency}
          />
        </div>
      )}

      <TransactionFormSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        transaction={editing}
      />
    </>
  );
}
