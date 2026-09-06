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

  const categoryLabel =
    transaction.type === "expense" ? categoryName(transaction.categoryId) : null;

  const title =
    transaction.type === "expense"
      ? transaction.description || categoryLabel || "Expense"
      : transaction.type === "income"
        ? transaction.description || "Money added"
        : credit
          ? "Adjustment · adds money"
          : "Adjustment · takes money";

  const subtitle =
    transaction.type === "expense" && transaction.description
      ? categoryLabel
      : transaction.type !== "expense"
        ? transaction.description
        : null;

  const Icon =
    transaction.type === "adjustment" ? Scale : credit ? ArrowDownLeft : ArrowUpRight;

  const content = (
    <>
      <span
        aria-hidden
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-full text-xl shadow-sm",
          credit ? "bg-positive-soft text-positive" : "bg-negative-soft text-[#93000a] dark:text-negative",
        )}
      >
        {transaction.type === "expense" ? (
          <CategoryIcon name={categoryIcon(transaction.categoryId)} className="size-5" />
        ) : (
          <Icon className="size-4" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold text-ink">{title}</span>
        {subtitle ? (
          <span className="block truncate text-sm text-ink-muted">{subtitle}</span>
        ) : null}
      </span>

      <span
        className={cn(
          "tabular shrink-0 text-xl font-semibold",
          credit ? "text-positive" : "text-ink",
        )}
      >
        {formatSignedAmount(transaction, currency)}
      </span>
    </>
  );

  if (!onSelect) {
    return (
      <div className={cn("flex min-h-[72px] items-center gap-4 px-4 py-4", className)}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(transaction)}
      className={cn(
        "flex min-h-[72px] w-full items-center gap-4 px-4 py-4 text-left transition-transform active:scale-[0.98]",
        className,
      )}
    >
      {content}
      <span className="sr-only">Edit this transaction</span>
    </button>
  );
}
