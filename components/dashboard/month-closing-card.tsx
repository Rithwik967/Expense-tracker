"use client";

import { Amount } from "@/components/ui/money";
import type { MonthlySummary } from "@/lib/finance/types";
import { formatMonthLabel } from "@/lib/utils/formatting";

/**
 * Shown in place of the today card when the selected month is not the current
 * one, because "available today" means nothing in a month that has finished or
 * has not started.
 */
export function MonthClosingCard({
  summary,
  currency,
}: {
  summary: MonthlySummary;
  currency: string;
}) {
  const upcoming = !summary.isComplete;
  const closing = summary.projectedEndBalance;
  const negative = closing < 0;

  return (
    <div
      className={
        negative
          ? "relative overflow-hidden rounded-3xl bg-negative-soft p-6 text-center text-[#93000a] shadow-[0_8px_24px_rgba(147,0,10,0.08)] dark:text-negative"
          : "relative overflow-hidden rounded-xl bg-positive-soft p-6 text-center text-positive shadow-md"
      }
    >
      <p className="label-caps opacity-90">
        {upcoming ? "Projected to end at" : "Ended at"}
      </p>
      <p className="tabular my-2 text-[32px] font-bold leading-10 tracking-tight">
        <Amount value={closing} currency={currency} />
      </p>
      <p className="text-sm opacity-80">{formatMonthLabel(summary.month)}</p>
      <p className="mt-4 text-sm opacity-90">
        Spent <Amount value={summary.totalSpent} currency={currency} /> of{" "}
        <Amount value={summary.allowanceTotal} currency={currency} /> allowance
      </p>
    </div>
  );
}
