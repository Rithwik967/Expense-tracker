import { lastDayOfMonth } from "@/lib/utils/dates";

import { createLedger, type Ledger } from "./calculations";
import { getAverageDailySpend } from "./monthly-balance";
import { ZERO, fromMinor, subtract, sum, type Money } from "./money";
import type { DateKey, LedgerInput, MonthKey } from "./types";

function ledgerFrom(source: LedgerInput | Ledger): Ledger {
  return "dailyBalance" in source ? source : createLedger(source);
}

export interface MonthProjection {
  readonly month: MonthKey;
  readonly asOf: DateKey;
  readonly daysElapsed: number;
  readonly daysRemaining: number;
  /** Closing balance if nothing further is recorded. */
  readonly projectedEndBalance: Money;
  /** Closing balance if the current pace of spending continues. */
  readonly paceEndBalance: Money;
  readonly averageDailySpend: Money;
  /** Even spend per remaining day that lands the month exactly at zero. */
  readonly sustainableDailySpend: Money;
  readonly isOnTrack: boolean;
}

/**
 * Where the month is heading.
 *
 * `projectedEndBalance` assumes no further spending and is the figure the app
 * treats as authoritative — it comes straight from the ledger and includes any
 * transactions already recorded for future dates. `paceEndBalance` is the
 * softer "if you carry on like this" estimate and is only ever shown as a hint.
 */
export function projectMonth(
  source: LedgerInput | Ledger,
  month: MonthKey,
  asOf: DateKey,
): MonthProjection {
  const ledger = ledgerFrom(source);
  const monthEnd = lastDayOfMonth(month);
  const days = ledger.dailyBalancesForMonth(month);

  const clamped: DateKey = asOf < month ? month : asOf > monthEnd ? monthEnd : asOf;
  const daysElapsed = asOf < month ? 0 : Number(clamped.slice(8, 10));
  const daysRemaining = days.length - daysElapsed;

  const projectedEndBalance = ledger.closingBalance(month);
  const averageDailySpend = getAverageDailySpend(ledger, month, asOf);

  const remainingAllowance = sum(
    days.filter((day) => day.date > clamped || daysElapsed === 0).map((day) => day.dailyAllowance),
  );
  const currentBalance = daysElapsed === 0 ? ledger.openingBalance(month) : days[daysElapsed - 1].endingBalance;

  const paceEndBalance = fromMinor(
    currentBalance + remainingAllowance - averageDailySpend * daysRemaining,
  );

  const sustainableDailySpend =
    daysRemaining > 0
      ? fromMinor(Math.max(0, Math.floor((currentBalance + remainingAllowance) / daysRemaining)))
      : ZERO;

  return {
    month,
    asOf,
    daysElapsed,
    daysRemaining,
    projectedEndBalance,
    paceEndBalance,
    averageDailySpend,
    sustainableDailySpend,
    isOnTrack: paceEndBalance >= 0,
  };
}

/**
 * Number of days the current balance would last at the recent average pace.
 * `null` when nothing has been spent yet, since there is no pace to project.
 */
export function getRunwayInDays(
  source: LedgerInput | Ledger,
  month: MonthKey,
  asOf: DateKey,
): number | null {
  const ledger = ledgerFrom(source);
  const averageDailySpend = getAverageDailySpend(ledger, month, asOf);
  if (averageDailySpend <= 0) return null;

  const balance = ledger.dailyBalance(asOf).endingBalance;
  if (balance <= 0) return 0;

  return Math.floor(balance / averageDailySpend);
}

/**
 * How far the month's spending sits below (positive) or above (negative) the
 * allowance accrued so far, as a percentage. Used for the Insights headline.
 */
export function getSpendingVarianceRatio(
  spent: Money,
  allowanceAccrued: Money,
): number | null {
  if (allowanceAccrued <= 0) return null;
  return (subtract(allowanceAccrued, spent) / allowanceAccrued) * 100;
}
