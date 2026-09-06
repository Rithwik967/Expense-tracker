"use client";

import { Info } from "lucide-react";

import { Amount } from "@/components/ui/money";
import { abs, type Money } from "@/lib/finance/money";
import type { MonthlySummary } from "@/lib/finance/types";
import { formatMonthNameOnly } from "@/lib/utils/formatting";

/**
 * States the gap when an explicit daily allowance disagrees with the budget.
 *
 * An override is honoured exactly as entered, which means ₹350 a day across 30
 * days accrues ₹10,500 against a ₹9,000 budget. Absorbing that difference
 * quietly would make the month's arithmetic impossible to follow, so it is
 * named instead.
 */
export function AllowanceNotice({
  summary,
  currency,
}: {
  summary: MonthlySummary;
  currency: string;
}) {
  if (summary.allowanceVariance === 0) return null;

  const over = summary.allowanceVariance > 0;
  const gap: Money = abs(summary.allowanceVariance);

  return (
    <p className="flex items-start gap-2 rounded-control bg-info-soft px-3 py-2 text-xs text-info">
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>
        Your daily allowance of <Amount value={summary.dailyAllowance} currency={currency} withDecimals />{" "}
        across {summary.daysInMonth} days accrues{" "}
        <Amount value={summary.allowanceTotal} currency={currency} /> —{" "}
        <Amount value={gap} currency={currency} /> {over ? "more" : "less"} than the{" "}
        {formatMonthNameOnly(summary.month)} budget of{" "}
        <Amount value={summary.monthlyBudget} currency={currency} />. Balances follow the allowance.
      </span>
    </p>
  );
}
