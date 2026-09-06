import { addMonthsToKey, toMonthKey } from "@/lib/utils/dates";

import { createLedger, resolveMonthAllowance, type Ledger } from "./calculations";
import { ZERO, add, atLeastZero, fromMinor, type Money } from "./money";
import type {
  CarryForwardRecord,
  DateKey,
  FinanceSettings,
  LedgerInput,
  MonthKey,
  MonthlyBudgetConfig,
} from "./types";

/** Month-level transaction sums, as produced by `monthly_transaction_totals`. */
export interface MonthlyTotals {
  readonly monthStart: MonthKey;
  readonly income: Money;
  readonly expenses: Money;
  readonly creditAdjustments: Money;
  readonly debitAdjustments: Money;
}

/** Net effect of a month's transactions on the running balance. */
export function netFromTotals(totals: MonthlyTotals): Money {
  return fromMinor(
    totals.income + totals.creditAdjustments - totals.expenses - totals.debitAdjustments,
  );
}

/**
 * Walk the month-by-month chain using pre-aggregated totals.
 *
 * Equivalent to replaying every transaction, because the order of transactions
 * inside a month cannot change that month's closing balance. That equivalence
 * is what lets the data layer show December without downloading January, and it
 * is asserted directly in the tests.
 */
export function computeMonthlyChain(
  settings: FinanceSettings,
  budgets: readonly MonthlyBudgetConfig[],
  totals: readonly MonthlyTotals[],
  anchorMonth: MonthKey,
  throughMonth: MonthKey,
): CarryForwardRecord[] {
  const budgetsByMonth = new Map(budgets.map((budget) => [budget.monthStart, budget]));
  const totalsByMonth = new Map(totals.map((entry) => [entry.monthStart, entry]));

  const records: CarryForwardRecord[] = [];
  let balance = ZERO;
  let cursor = anchorMonth;

  while (cursor <= throughMonth) {
    const allowance = resolveMonthAllowance(cursor, budgetsByMonth.get(cursor), settings);
    const monthTotals = totalsByMonth.get(cursor);

    balance = add(balance, allowance.allocatedTotal);
    if (monthTotals) balance = add(balance, netFromTotals(monthTotals));

    records.push({
      month: cursor,
      closingBalance: balance,
      carriedIntoNextMonth: balance,
      extraMoney: atLeastZero(balance),
    });

    cursor = addMonthsToKey(cursor, 1);
  }

  return records;
}

/**
 * Balance carried into `month`, derived from months that came before it.
 *
 * Returns zero when `month` is at or before the anchor, since nothing has
 * accrued yet.
 */
export function computeOpeningBalance(
  settings: FinanceSettings,
  budgets: readonly MonthlyBudgetConfig[],
  totals: readonly MonthlyTotals[],
  anchorMonth: MonthKey,
  month: MonthKey,
): Money {
  if (month <= anchorMonth) return ZERO;

  const chain = computeMonthlyChain(
    settings,
    budgets,
    totals,
    anchorMonth,
    addMonthsToKey(month, -1),
  );

  return chain.length === 0 ? ZERO : chain[chain.length - 1].closingBalance;
}

function ledgerFrom(source: LedgerInput | Ledger): Ledger {
  return "dailyBalance" in source ? source : createLedger(source);
}

/**
 * Balance carried into `month`: the previous month's closing balance, signed.
 *
 * A positive figure is unused spending capacity. A negative figure means the
 * user has already drawn on future allowance, and it carries over as a debt
 * that the new month's allowance pays down day by day. Nothing is written to
 * the database and no compensating transaction is created, so the amount cannot
 * be counted twice.
 */
export function getCarryForward(source: LedgerInput | Ledger, month: MonthKey): Money {
  return ledgerFrom(source).openingBalance(month);
}

/**
 * Extra Money brought into `month`: carry-forward, floored at zero.
 *
 * A negative month-end never becomes "extra"; it stays a negative opening
 * balance.
 */
export function getExtraMoney(source: LedgerInput | Ledger, month: MonthKey): Money {
  return atLeastZero(getCarryForward(source, month));
}

/**
 * The Fun Fund: accumulated surplus the user has genuinely saved from earlier
 * months and can still spend.
 *
 * This is a *presentation* of carry-forward, not a second wallet. The amount is
 * already inside the current available balance, so it must never be added to
 * it. Spending it is an ordinary expense transaction like any other.
 */
export function getFunFund(source: LedgerInput | Ledger, asOf: DateKey): Money {
  return getExtraMoney(source, toMonthKey(asOf));
}

/**
 * Month-by-month closing balances from the first tracked month up to `through`.
 *
 * These figures are a chain, not a series to be summed: each month's closing
 * balance already contains the previous month's. Summing them would double
 * count.
 */
export function getCarryForwardHistory(
  source: LedgerInput | Ledger,
  through: MonthKey,
): CarryForwardRecord[] {
  const ledger = ledgerFrom(source);
  if (!ledger.hasData) return [];

  const records: CarryForwardRecord[] = [];
  let cursor = ledger.startMonth;

  while (cursor <= through) {
    const closingBalance = ledger.closingBalance(cursor);
    records.push({
      month: cursor,
      closingBalance,
      carriedIntoNextMonth: closingBalance,
      extraMoney: atLeastZero(closingBalance),
    });
    cursor = addMonthsToKey(cursor, 1);
  }

  return records;
}

/**
 * Completed months only — months whose last day is strictly before `asOf`.
 * These are the carry-forwards that are settled rather than still moving.
 */
export function getCompletedCarryForwards(
  source: LedgerInput | Ledger,
  asOf: DateKey,
): CarryForwardRecord[] {
  const currentMonth = toMonthKey(asOf);
  const previousMonth = addMonthsToKey(currentMonth, -1);
  return getCarryForwardHistory(source, previousMonth);
}
