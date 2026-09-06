import "server-only";

import type { DataRepository, MonthlyTotalsRecord } from "@/lib/data/types";
import { createLedger, type Ledger } from "@/lib/finance/calculations";
import {
  computeMonthlyChain,
  computeOpeningBalance,
  getFunFund,
  type MonthlyTotals,
} from "@/lib/finance/carry-forward";
import { getSafeToSpend, getStartOfDayAvailable } from "@/lib/finance/daily-balance";
import {
  getAverageDailySpend,
  getCategoryTotals,
  getHighestSpendingDay,
  getMonthlySummary,
  getWeeklyBreakdown,
} from "@/lib/finance/monthly-balance";
import { ZERO, type Money } from "@/lib/finance/money";
import { projectMonth } from "@/lib/finance/projections";
import type {
  DateKey,
  FinanceSettings,
  FinanceTransaction,
  MonthKey,
  MonthlyBudgetConfig,
} from "@/lib/finance/types";
import { isWithinMonth, lastDayOfMonth, toMonthKey } from "@/lib/utils/dates";
import type { AppSettingsView, DayView, MonthView } from "@/types/app";

/**
 * The bridge between storage and the calculation engine.
 *
 * Loads exactly what a given month needs — the month's own transactions, plus a
 * single opening figure folded from the months before it — hands that to
 * lib/finance, and returns finished view models. Screens receive numbers, never
 * the ingredients for numbers.
 */

interface LoadedLedger {
  readonly ledger: Ledger;
  readonly anchorMonth: MonthKey | null;
  readonly settings: FinanceSettings;
}

function toFinanceSettings(settings: AppSettingsView): FinanceSettings {
  return {
    currency: settings.currency,
    defaultMonthlyBudget: settings.defaultMonthlyBudget,
    defaultDailyAllowance: settings.defaultDailyAllowance,
    monthStartDay: settings.monthStartDay,
  };
}

function toMonthlyTotals(record: MonthlyTotalsRecord): MonthlyTotals {
  return {
    monthStart: record.monthStart,
    income: record.income,
    expenses: record.expenses,
    creditAdjustments: record.creditAdjustments,
    debitAdjustments: record.debitAdjustments,
  };
}

const toFinanceTransaction = (record: {
  id: string;
  date: DateKey;
  type: FinanceTransaction["type"];
  amount: Money;
  adjustmentDirection: FinanceTransaction["adjustmentDirection"];
  categoryId: string | null;
  description: string | null;
}): FinanceTransaction => ({
  id: record.id,
  date: record.date,
  type: record.type,
  amount: record.amount,
  adjustmentDirection: record.adjustmentDirection,
  categoryId: record.categoryId,
  description: record.description,
});

/**
 * Build a ledger scoped to one month.
 *
 * Months before `month` are collapsed into `openingBalance` using the
 * `monthly_transaction_totals` aggregate. That produces identical results to
 * replaying every historical transaction — a month's closing balance does not
 * depend on the order of transactions within it — while keeping the amount of
 * data fetched proportional to one month rather than to the whole history.
 */
async function loadLedgerForMonth(
  repository: DataRepository,
  month: MonthKey,
): Promise<LoadedLedger> {
  const monthEnd = lastDayOfMonth(month);

  const [settingsRecord, budgetRecords, anchorMonth] = await Promise.all([
    repository.getSettings(),
    repository.listMonthlyBudgets(),
    repository.getEarliestActivityMonth(),
  ]);

  const settings = toFinanceSettings(settingsRecord);
  const budgets: MonthlyBudgetConfig[] = budgetRecords.map((budget) => ({
    monthStart: budget.monthStart,
    monthlyBudget: budget.monthlyBudget,
    dailyAllowance: budget.dailyAllowance,
  }));

  const [transactionRecords, plannedRecords, priorTotals] = await Promise.all([
    repository.listTransactions({ from: month, to: monthEnd, sort: "date-asc" }),
    repository.listPlannedExpenses({ from: month, to: monthEnd }),
    anchorMonth && month > anchorMonth
      ? repository.listMonthlyTotalsBefore(month)
      : Promise.resolve([] as MonthlyTotalsRecord[]),
  ]);

  const effectiveAnchor = anchorMonth ?? month;
  const openingBalance =
    anchorMonth === null
      ? ZERO
      : computeOpeningBalance(
          settings,
          budgets,
          priorTotals.map(toMonthlyTotals),
          anchorMonth,
          month,
        );

  const ledger = createLedger({
    settings,
    budgets,
    transactions: transactionRecords.map(toFinanceTransaction),
    plannedExpenses: plannedRecords.map((planned) => ({
      id: planned.id,
      plannedDate: planned.plannedDate,
      amount: planned.amount,
      categoryId: planned.categoryId,
      description: planned.description,
      status: planned.status,
    })),
    anchorMonth: effectiveAnchor,
    openingBalance,
  });

  return { ledger, anchorMonth, settings };
}

/** Everything the dashboard, calendar and insights screens render for a month. */
export async function getMonthView(
  repository: DataRepository,
  month: MonthKey,
  today: DateKey,
): Promise<MonthView> {
  const monthEnd = lastDayOfMonth(month);
  const { ledger, anchorMonth, settings } = await loadLedgerForMonth(repository, month);

  const [transactions, plannedExpenses, priorTotals] = await Promise.all([
    repository.listTransactions({ from: month, to: monthEnd, sort: "date-desc" }),
    repository.listPlannedExpenses({ from: month, to: monthEnd }),
    anchorMonth ? repository.listMonthlyTotalsBefore(month) : Promise.resolve([]),
  ]);

  const summary = getMonthlySummary(ledger, month, today);
  const isCurrentMonth = isWithinMonth(today, month);

  const categoryTotals = getCategoryTotals(ledger, month);

  // The carry-forward history is a chain of closing balances, not a series to
  // be summed: each entry already contains the one before it.
  const carryForwardHistory = anchorMonth
    ? computeMonthlyChain(
        settings,
        (await repository.listMonthlyBudgets()).map((budget) => ({
          monthStart: budget.monthStart,
          monthlyBudget: budget.monthlyBudget,
          dailyAllowance: budget.dailyAllowance,
        })),
        priorTotals.map(toMonthlyTotals),
        anchorMonth,
        month,
      ).slice(0, -1)
    : [];

  return {
    month,
    today,
    isCurrentMonth,
    summary,
    days: ledger.dailyBalancesForMonth(month),
    weeks: getWeeklyBreakdown(ledger, month),
    categoryTotals,
    projection: projectMonth(ledger, month, today),
    transactions,
    plannedExpenses,
    todayBalance: isCurrentMonth ? ledger.dailyBalance(today) : null,
    startOfDayAvailable: isCurrentMonth ? getStartOfDayAvailable(ledger, today) : null,
    safeToSpend: isCurrentMonth ? getSafeToSpend(ledger, today) : null,
    funFund: getFunFund(ledger, month),
    averageDailySpend: getAverageDailySpend(ledger, month, today),
    highestSpendingDay: getHighestSpendingDay(ledger, month),
    largestCategory: categoryTotals[0] ?? null,
    carryForwardHistory,
  };
}

/** Full breakdown of a single day, for the day-detail sheet. */
export async function getDayView(
  repository: DataRepository,
  date: DateKey,
): Promise<DayView> {
  const month = toMonthKey(date);
  const { ledger } = await loadLedgerForMonth(repository, month);

  const [transactions, plannedExpenses] = await Promise.all([
    repository.listTransactions({ from: date, to: date, sort: "date-asc" }),
    repository.listPlannedExpenses({ from: date, to: date }),
  ]);

  return {
    balance: ledger.dailyBalance(date),
    transactions,
    plannedExpenses,
  };
}
