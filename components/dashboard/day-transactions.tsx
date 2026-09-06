"use client";

import Link from "next/link";

import { TransactionRow } from "@/components/transactions/transaction-row";
import { EmptyState } from "@/components/ui/states";
import type { TransactionRecord } from "@/lib/data/types";
import { Receipt } from "lucide-react";

/**
 * A short list of transactions with its own heading — today's on Home, or the
 * most recent few when an earlier month is being viewed.
 */
export function DayTransactions({
  title,
  transactions,
  emptyTitle,
  emptyDescription,
  onSelect,
  onAdd,
  seeAllHref,
}: {
  title: string;
  transactions: readonly TransactionRecord[];
  emptyTitle: string;
  emptyDescription?: string;
  onSelect: (transaction: TransactionRecord) => void;
  onAdd?: () => void;
  seeAllHref?: string;
}) {
  return (
    <section aria-labelledby="day-transactions-heading" className="flex flex-col gap-2">
      <div className="mb-1 flex items-end justify-between gap-3 px-1">
        <h2 id="day-transactions-heading" className="text-xl font-semibold text-ink">
          {title}
        </h2>
        {seeAllHref ? (
          <Link href={seeAllHref} className="label-caps text-brand">
            View All
          </Link>
        ) : null}
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-xl bg-surface-raised shadow-card">
          <EmptyState
            icon={Receipt}
            title={emptyTitle}
            description={emptyDescription}
            action={
              onAdd ? (
                <button
                  type="button"
                  onClick={onAdd}
                  className="text-sm font-medium text-brand underline-offset-4 hover:underline"
                >
                  Add one
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {transactions.map((transaction) => (
            <li key={transaction.id}>
              <TransactionRow
                transaction={transaction}
                onSelect={onSelect}
                className="rounded-xl bg-surface-raised shadow-card"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
