"use client";

import { useAppData } from "@/components/providers/app-data-provider";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { Card } from "@/components/ui/card";
import { Amount } from "@/components/ui/money";
import { groupByDate } from "@/hooks/use-transactions";
import type { TransactionRecord } from "@/lib/data/types";
import { ZERO, sum } from "@/lib/finance/money";
import { formatRelativeDayLabel } from "@/lib/utils/formatting";

/**
 * Transactions grouped under date headings, newest first.
 *
 * Each heading carries that day's expense total. Adjustments are excluded from
 * it deliberately: they are bookkeeping corrections rather than spending, and
 * "spent" has to mean the same thing here as it does on Home and in Insights.
 */
export function TransactionList({
  transactions,
  onSelect,
}: {
  transactions: readonly TransactionRecord[];
  onSelect?: (transaction: TransactionRecord) => void;
}) {
  const { today, currency } = useAppData();
  const groups = groupByDate(transactions);

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const spent = sum(
          group.transactions.filter((row) => row.type === "expense").map((row) => row.amount),
        );

        return (
          <section key={group.date} aria-labelledby={`day-${group.date}`}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 px-1">
              <h3 id={`day-${group.date}`} className="text-xs font-semibold text-ink-muted">
                {today ? formatRelativeDayLabel(group.date, today) : group.date}
              </h3>
              {spent > ZERO ? (
                <p className="text-xs text-ink-subtle">
                  <Amount value={spent} currency={currency} /> spent
                </p>
              ) : null}
            </div>

            <Card className="divide-y divide-border overflow-hidden">
              {group.transactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  onSelect={onSelect}
                />
              ))}
            </Card>
          </section>
        );
      })}
    </div>
  );
}
