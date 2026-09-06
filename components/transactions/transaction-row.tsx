"use client";

import { ArrowDownLeft, ArrowUpRight, Scale } from "lucide-react";

import { useAppData } from "@/components/providers/app-data-provider";
import { CategoryIcon } from "@/components/ui/category-icon";
import { cn } from "@/lib/utils/cn";
import type { TransactionRecord } from "@/lib/data/types";
import { formatCurrency } from "@/lib/utils/currency";

/**
 * One transaction in a list.
 *
 * The sign is the whole point of the row, so it is stated explicitly rather
 * than implied by colour alone: an expense reads "−₹150" and money in reads
 * "+₹500", which still works for a screen reader and for anyone who cannot
 * distinguish the two colours.
 */

/** Does this row add to the balance or take from it? */
export function isCredit(transaction: TransactionRecord): boolean {
  return (
    transaction.type === "income" ||
    (transaction.type === "adjustment" && transaction.adjustmentDirection === "credit")
  );
}

export function formatSignedAmount(transaction: TransactionRecord, currency: string): string {
  const formatted = formatCurrency(transaction.amount, currency);
  return `${isCredit(transaction) ? "+" : "−"}${formatted}`;
}

export function TransactionRow({
  transaction,
  onSelect,
  className,
}: {
  transaction: TransactionRecord;
  onSelect?: (transaction: TransactionRecord) => void;
  className?: string;
}) {
  const { currency, categoryName, categoryIcon } = useAppData();
  const credit = isCredit(transaction);

  const title =
    transaction.type === "expense"
      ? categoryName(transaction.categoryId)
      : transaction.type === "income"
        ? "Money added"
        : credit
          ? "Adjustment · adds money"
          : "Adjustment · takes money";

  const Icon =
    transaction.type === "adjustment" ? Scale : credit ? ArrowDownLeft : ArrowUpRight;

  const content = (
    <>
      <span
        aria-hidden
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-sm",
          credit ? "bg-positive-soft text-positive" : "bg-surface-muted text-ink-muted",
        )}
      >
        {transaction.type === "expense" ? (
          <CategoryIcon name={categoryIcon(transaction.categoryId)} />
        ) : (
          <Icon className="size-4" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{title}</span>
        {transaction.description ? (
          <span className="block truncate text-xs text-ink-muted">{transaction.description}</span>
        ) : null}
      </span>

      <span
        className={cn(
          "tabular shrink-0 text-sm font-semibold",
          credit ? "text-positive" : "text-ink",
        )}
      >
        {formatSignedAmount(transaction, currency)}
      </span>
    </>
  );

  if (!onSelect) {
    return (
      <div className={cn("flex min-h-[56px] items-center gap-3 px-4 py-2.5", className)}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(transaction)}
      className={cn(
        "flex min-h-[56px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-muted",
        className,
      )}
    >
      {content}
      <span className="sr-only">Edit this transaction</span>
    </button>
  );
}
