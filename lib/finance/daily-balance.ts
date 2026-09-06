import { lastDayOfMonth, toMonthKey } from "@/lib/utils/dates";

import { createLedger, type Ledger } from "./calculations";
import { ZERO, subtract, sum, type Money } from "./money";
import type { DailyBalance, DateKey, LedgerInput, SafeToSpend } from "./types";

function ledgerFrom(source: LedgerInput | Ledger): Ledger {
  return "dailyBalance" in source ? source : createLedger(source);
}

/**
 * Full breakdown of a single day.
 *
 * Always recomputed from transactions, so editing a past expense is reflected
 * here and on every later day without any invalidation step.
 */
export function getDailyBalance(source: LedgerInput | Ledger, date: DateKey): DailyBalance {
  return ledgerFrom(source).dailyBalance(date);
}

export function getDailyBalancesForMonth(
  source: LedgerInput | Ledger,
  month: DateKey,
): readonly DailyBalance[] {
  return ledgerFrom(source).dailyBalancesForMonth(toMonthKey(month));
}

/**
 * Money available at the end of `date` — after that day's allowance and after
 * everything already spent that day.
 */
export function getTodayAvailable(source: LedgerInput | Ledger, date: DateKey): Money {
  return ledgerFrom(source).dailyBalance(date).endingBalance;
}

/**
 * Money available at the start of `date` — the previous day's closing balance
 * plus today's allowance, before any of today's spending.
 */
export function getStartOfDayAvailable(source: LedgerInput | Ledger, date: DateKey): Money {
  const day = ledgerFrom(source).dailyBalance(date);
  return sum([day.startingBalance, day.dailyAllowance]);
}

/**
 * Available balance minus the planned expenses still reserved ahead of it.
 *
 * Planned expenses are reservations, not spending: they are subtracted here and
 * nowhere else, so the actual balance is untouched until one is converted into
 * a real transaction.
 *
 * The default planning horizon is "the rest of the current month", including
 * anything still planned for today.
 */
export function getSafeToSpend(
  source: LedgerInput | Ledger,
  date: DateKey,
  horizonEnd: DateKey = lastDayOfMonth(toMonthKey(date)),
): SafeToSpend {
  const ledger = ledgerFrom(source);
  const availableBalance = ledger.dailyBalance(date).endingBalance;

  const reserved = ledger
    .plannedExpensesInRange(date, horizonEnd)
    .filter((planned) => planned.status === "planned");

  const reservedForPlanned = reserved.length > 0 ? sum(reserved.map((p) => p.amount)) : ZERO;

  return {
    date,
    availableBalance,
    reservedForPlanned,
    safeToSpend: subtract(availableBalance, reservedForPlanned),
    plannedExpenseCount: reserved.length,
    horizonEnd,
  };
}
