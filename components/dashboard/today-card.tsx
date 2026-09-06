"use client";

import { BadgeCheck, CalendarClock, TrendingDown } from "lucide-react";

import { Amount } from "@/components/ui/money";
import { add, subtract, type Money } from "@/lib/finance/money";
import type { DailyBalance } from "@/lib/finance/types";
import { cn } from "@/lib/utils/cn";

/**
 * The headline: what today is actually worth.
 *
 * Two figures matter and they are not the same. "Available now" is the day's
 * closing balance. A negative balance is stated plainly rather than clamped to
 * zero: the user has drawn on future allowance and the coming days will recover it.
 */
export function TodayCard({
  balance,
  startOfDayAvailable,
  currency,
}: {
  balance: DailyBalance;
  startOfDayAvailable: Money;
  currency: string;
}) {
  const negative = balance.endingBalance < 0;
  const carriedOver = subtract(startOfDayAvailable, balance.dailyAllowance);
  const afterTomorrow = add(balance.endingBalance, balance.dailyAllowance);

  if (negative) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-negative-soft p-6 text-center text-[#93000a] shadow-[0_8px_24px_rgba(147,0,10,0.08)] dark:text-negative">
        <div className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-negative/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 size-56 rounded-full bg-negative/10 blur-3xl" />
        <div className="relative z-10 mx-auto mb-2 flex size-14 items-center justify-center rounded-full bg-[#93000a]/10 dark:bg-negative/10">
          <TrendingDown className="size-7 text-negative" aria-hidden />
        </div>
        <h2 className="relative z-10 text-xl font-semibold opacity-90">You&apos;re behind</h2>
        <p className="tabular relative z-10 my-1 text-[32px] font-bold leading-10 tracking-tight">
          <Amount value={balance.endingBalance} currency={currency} withDecimals={false} />
        </p>
        <p className="relative z-10 mx-auto mt-1 max-w-[220px] text-sm opacity-80">
          Future daily allowances will gradually pay this back.
        </p>
        <p className="relative z-10 mt-6 inline-flex items-center gap-2 rounded-full bg-[#93000a]/5 px-4 py-2 text-xs font-semibold uppercase tracking-wider">
          <CalendarClock className="size-4 opacity-80" aria-hidden />
          <span>
            Tomorrow +
            <Amount value={balance.dailyAllowance} currency={currency} withDecimals={false} />
            {" · "}
            After <Amount value={afterTomorrow} currency={currency} withDecimals={false} />
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="relative mt-1 overflow-hidden rounded-xl bg-positive-soft p-6 text-center text-positive shadow-md">
      <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-positive/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-12 size-32 rounded-full bg-positive/20 blur-2xl" />
      <p className="label-caps relative z-10 mb-2 flex items-center justify-center gap-1 opacity-90">
        <BadgeCheck className="size-3.5" aria-hidden />
        Safe to spend today
      </p>
      <h1 className="tabular relative z-10 mb-4 text-[32px] font-bold leading-10 drop-shadow-sm">
        <Amount value={balance.endingBalance} currency={currency} withDecimals={false} />
      </h1>
      <p className="relative z-10 inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-positive/10 px-3 py-1 text-sm">
        <span>
          <Amount value={balance.dailyAllowance} currency={currency} withDecimals={false} /> daily
          allowance
        </span>
        <span className={cn("size-1 rounded-full bg-positive/50")} />
        <span>
          <Amount value={carriedOver} currency={currency} withDecimals={false} /> carried over
        </span>
      </p>
    </div>
  );
}
