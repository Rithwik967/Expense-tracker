import { lastDayOfMonth, toMonthKey } from "@/lib/utils/dates";

import {
  accumulateMovements,
  allowanceAccruedThrough,
  createLedger,
  type Ledger,
} from "./calculations";
import {
  ZERO,
  atLeastZero,
  fromMinor,
  percentageOf,
  subtract,
  sum,
  type Money,
} from "./money";
import type {
  CategoryTotal,
  DateKey,
  LedgerInput,
  MonthKey,
  MonthlySummary,
  WeeklyBreakdown,
} from "./types";

function ledgerFrom(source: LedgerInput | Ledger): Ledger {
  return "dailyBalance" in source ? source : createLedger(source);
}

/**
 * Everything the dashboard needs about one month.
 *
 * Two different time rules apply, deliberately:
 *
 * - **Totals** (`totalSpent`, `totalIncome`, …) cover the whole month, so they
 *   match what the transaction list shows for that month even when some rows
 *   are dated in the future.
 * - **Balances** (`currentBalance`) are as of `asOf`, so today's headline number
 *   is never inflated by a transaction that has not happened yet.
 */
export function getMonthlySummary(
  source: LedgerInput | Ledger,
  month: MonthKey,
  asOf: DateKey,
): MonthlySummary {
  const ledger = ledgerFrom(source);
  const allowance = ledger.allowanceFor(month);
  const monthEnd = lastDayOfMonth(month);
  const carryForward = ledger.openingBalance(month);

  const monthTransactions = ledger.transactionsInMonth(month);
  const movements = accumulateMovements(monthTransactions);

  const started = asOf >= month;
  const clampedAsOf: DateKey = asOf < month ? month : asOf > monthEnd ? monthEnd : asOf;

  const currentBalance = started ? ledger.dailyBalance(clampedAsOf).endingBalance : carryForward;
  const allowanceAccruedToDate = started ? allowanceAccruedThrough(allowance, clampedAsOf) : ZERO;

  return {
    month,
    monthlyBudget: allowance.monthlyBudget,
    dailyAllowance: allowance.perDay,
    daysInMonth: allowance.daysInMonth,
    carryForward,
    totalIncome: movements.income,
    totalExpenses: movements.expenses,
    totalAdjustments: fromMinor(movements.creditAdjustments - movements.debitAdjustments),
    totalSpent: movements.expenses,
    currentBalance,
    projectedEndBalance: ledger.closingBalance(month),
    extraMoney: atLeastZero(carryForward),
    allowanceAccruedToDate,
    allowanceTotal: allowance.allocatedTotal,
    allowanceVariance: allowance.variance,
    transactionCount: movements.transactionCount,
    asOf: clampedAsOf,
    isComplete: asOf > monthEnd,
  };
}

/** Budget still unspent for the month: allowance for the whole month, less spending. */
export function getRemainingBudget(summary: MonthlySummary): Money {
  return subtract(sum([summary.allowanceTotal, summary.carryForward]), summary.totalSpent);
}

/** Total money the month has to work with: its budget plus anything carried in. */
export function getTotalAvailableForMonth(summary: MonthlySummary): Money {
  return sum([summary.allowanceTotal, atLeastZero(summary.carryForward)]);
}

/**
 * Expenses grouped by category for a month, largest first.
 *
 * `categoryId` is `null` only for legacy rows; the schema requires a category
 * on every expense.
 */
export function getCategoryTotals(
  source: LedgerInput | Ledger,
  month: MonthKey,
): CategoryTotal[] {
  const ledger = ledgerFrom(source);
  const expenses = ledger.transactionsInMonth(month).filter((t) => t.type === "expense");
  const total = sum(expenses.map((t) => t.amount));

  const byCategory = new Map<string | null, { amount: number; count: number }>();
  for (const expense of expenses) {
    const existing = byCategory.get(expense.categoryId) ?? { amount: 0, count: 0 };
    existing.amount += expense.amount;
    existing.count += 1;
    byCategory.set(expense.categoryId, existing);
  }

  return [...byCategory.entries()]
    .map(([categoryId, { amount, count }]) => ({
      categoryId,
      amount: fromMinor(amount),
      transactionCount: count,
      percentage: percentageOf(fromMinor(amount), total),
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Spending grouped into calendar weeks within the month.
 *
 * Weeks are chunks of the month itself (1-7, 8-14, …) rather than ISO weeks, so
 * every week belongs to exactly one month and the weekly figures always add up
 * to the monthly total. The final chunk is short in most months, which is why
 * each week reports the allowance it actually generated rather than a flat
 * seven-day figure.
 */
export function getWeeklyBreakdown(
  source: LedgerInput | Ledger,
  month: MonthKey,
): WeeklyBreakdown[] {
  const ledger = ledgerFrom(source);
  const days = ledger.dailyBalancesForMonth(month);
  const weeks: WeeklyBreakdown[] = [];

  for (let offset = 0; offset < days.length; offset += 7) {
    const chunk = days.slice(offset, offset + 7);
    const first = chunk[0];
    const last = chunk[chunk.length - 1];
    const allowanceGenerated = sum(chunk.map((day) => day.dailyAllowance));
    const spent = sum(chunk.map((day) => day.totalSpent));

    weeks.push({
      weekNumber: offset / 7 + 1,
      start: first.date,
      end: last.date,
      days: chunk.length,
      allowanceGenerated,
      spent,
      difference: subtract(allowanceGenerated, spent),
    });
  }

  return weeks;
}

/** The day in `month` with the highest spending, or `null` if nothing was spent. */
export function getHighestSpendingDay(
  source: LedgerInput | Ledger,
  month: MonthKey,
): { date: DateKey; amount: Money } | null {
  const days = ledgerFrom(source).dailyBalancesForMonth(month);
  let best: { date: DateKey; amount: Money } | null = null;

  for (const day of days) {
    if (day.totalSpent > 0 && (best === null || day.totalSpent > best.amount)) {
      best = { date: day.date, amount: day.totalSpent };
    }
  }

  return best;
}

/**
 * Average spend per elapsed day.
 *
 * Divides by days *elapsed*, not days in the month, so the figure is comparable
 * with the daily allowance from the first of the month onward.
 */
export function getAverageDailySpend(
  source: LedgerInput | Ledger,
  month: MonthKey,
  asOf: DateKey,
): Money {
  const ledger = ledgerFrom(source);
  const monthEnd = lastDayOfMonth(month);
  if (asOf < month) return ZERO;

  const clamped = asOf > monthEnd ? monthEnd : asOf;
  const elapsed = Number(clamped.slice(8, 10));
  const spent = sum(
    ledger
      .dailyBalancesForMonth(month)
      .filter((day) => day.date <= clamped)
      .map((day) => day.totalSpent),
  );

  return fromMinor(Math.round(spent / elapsed));
}

export { toMonthKey };
