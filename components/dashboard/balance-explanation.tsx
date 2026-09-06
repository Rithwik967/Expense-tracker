"use client";

import { Calculator, ChevronDown } from "lucide-react";
import * as React from "react";

import { Amount } from "@/components/ui/money";
import { subtract, type Money } from "@/lib/finance/money";
import type { DailyBalance } from "@/lib/finance/types";
import { cn } from "@/lib/utils/cn";

/**
 * Walks through today's arithmetic: yesterday's leftover, plus the allowance,
 * minus spending. The figures are the same ones on the hero card — this only
 * names the steps.
 */
export function BalanceExplanation({
  balance,
  startOfDayAvailable,
  currency,
}: {
  balance: DailyBalance;
  startOfDayAvailable: Money;
  currency: string;
}) {
  const [open, setOpen] = React.useState(false);
  const previousDays = subtract(startOfDayAvailable, balance.dailyAllowance);

  return (
    <div className="overflow-hidden rounded-xl bg-surface-low shadow-card">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span className="flex items-center gap-2">
          <Calculator className="size-5 text-ink-subtle" aria-hidden />
          <span className="text-base font-semibold text-ink">Daily balance explanation</span>
        </span>
        <ChevronDown
          className={cn("size-5 text-ink-subtle transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <dl className="flex flex-col gap-2 px-4 pb-4 text-sm text-ink-muted">
          <div className="flex items-center justify-between">
            <dt>Previous days</dt>
            <dd className="tabular font-semibold text-ink">
              <Amount value={previousDays} currency={currency} />
            </dd>
          </div>
          <div className="flex items-center justify-between text-positive">
            <dt>+ Allowance</dt>
            <dd className="tabular font-semibold">
              <Amount value={balance.dailyAllowance} currency={currency} />
            </dd>
          </div>
          <div className="flex items-center justify-between text-negative">
            <dt>− Spending</dt>
            <dd className="tabular font-semibold">
              <Amount value={balance.totalSpent} currency={currency} />
            </dd>
          </div>
          <div className="my-1 h-px bg-border-strong/30" />
          <div className="flex items-center justify-between font-bold text-ink">
            <dt>Total safe to spend</dt>
            <dd
              className={`tabular ${balance.endingBalance < 0 ? "text-negative" : "text-positive"}`}
            >
              <Amount value={balance.endingBalance} currency={currency} />
            </dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}
