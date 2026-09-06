"use client";

import { PartyPopper } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Amount } from "@/components/ui/money";
import type { Money } from "@/lib/finance/money";
import type { CarryForwardRecord, MonthKey } from "@/lib/finance/types";
import { addMonthsToKey } from "@/lib/utils/dates";
import { formatMonthLabel } from "@/lib/utils/formatting";

/**
 * Extra Money and the Fun Fund.
 *
 * Both are the same number wearing two hats: the positive balance carried in
 * from earlier months. It is already inside the available balance.
 */
export function ExtraMoneyCard({
  month,
  funFund,
  carryForward,
  history,
  currency,
}: {
  month: MonthKey;
  funFund: Money;
  carryForward: Money;
  history: readonly CarryForwardRecord[];
  currency: string;
}) {
  const [showHistory, setShowHistory] = React.useState(false);
  const previousMonth = addMonthsToKey(month, -1);
  const inDebt = carryForward < 0;
  const relevantHistory = [...history].reverse().slice(0, 6);

  if (inDebt) {
    return (
      <div className="flex items-center gap-4 overflow-hidden rounded-xl bg-negative-soft p-4 text-[#93000a] shadow-card dark:text-negative">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-negative text-white shadow-md">
          <PartyPopper className="size-6 rotate-180" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-semibold">
            Carried debt: <Amount value={carryForward} currency={currency} />
          </p>
          <p className="mt-0.5 text-sm opacity-90">
            {formatMonthLabel(previousMonth)} ended below zero, so this month&apos;s allowance is
            recovering it day by day.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-tertiary-container p-4 text-on-tertiary shadow-card">
      <div className="pointer-events-none absolute top-0 right-0 -mt-8 -mr-8 size-24 rounded-full bg-tertiary/5" />
      <div className="relative z-10 flex items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-tertiary text-white shadow-md">
          <PartyPopper className="size-6" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-xl font-semibold">
            Fun Fund: <Amount value={funFund} currency={currency} />
          </p>
          <p className="text-sm leading-tight opacity-90">
            {funFund > 0 ? (
              <>
                You&apos;ve built <Amount value={funFund} currency={currency} /> of flexible
                spending. Already part of today&apos;s available balance.
              </>
            ) : (
              <>
                Nothing carried into {formatMonthLabel(month)} yet. Whatever is left at month end
                becomes next month&apos;s Fun Fund.
              </>
            )}
          </p>
        </div>
      </div>

      {relevantHistory.length > 0 ? (
        <div className="relative z-10 mt-3 border-t border-white/10 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory((current) => !current)}
            aria-expanded={showHistory}
            className="px-0 text-on-tertiary hover:bg-white/5 hover:text-on-tertiary"
          >
            {showHistory ? "Hide" : "Show"} earlier months
          </Button>
          {showHistory ? (
            <ul className="mt-2 space-y-1.5">
              {relevantHistory.map((record) => (
                <li key={record.month} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="opacity-80">{formatMonthLabel(record.month, "short")}</span>
                  <span className="tabular font-medium">
                    <Amount value={record.closingBalance} currency={currency} />
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
