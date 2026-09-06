"use client";

import { Plus, Receipt } from "lucide-react";
import Link from "next/link";

import { TransactionRow } from "@/components/transactions/transaction-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import type { TransactionRecord } from "@/lib/data/types";

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
    <section aria-labelledby="day-transactions-heading">
      <div className="mb-1.5 flex items-center justify-between gap-3 px-1">
        <h2 id="day-transactions-heading" className="text-sm font-semibold text-ink">
          {title}
        </h2>
        {seeAllHref ? (
          <Button variant="link" size="sm" className="h-auto px-0" asChild>
            <Link href={seeAllHref}>See all</Link>
          </Button>
        ) : null}
      </div>

      <Card className="divide-y divide-border overflow-hidden">
        {transactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={emptyTitle}
            description={emptyDescription}
            action={
              onAdd ? (
                <Button size="sm" variant="outline" onClick={onAdd}>
                  <Plus aria-hidden />
                  Add one
                </Button>
              ) : undefined
            }
          />
        ) : (
          transactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} onSelect={onSelect} />
          ))
        )}
      </Card>
    </section>
  );
}
