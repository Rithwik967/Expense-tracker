/**
 * The finance vocabulary, re-exported for consumers outside `lib/finance`.
 *
 * The definitions live next to the engine that produces them so a type can
 * never drift from the code that computes it; this file exists so a screen can
 * import a `DailyBalance` without reaching into the engine's internals.
 */

export type { Money } from "@/lib/finance/money";
export type { DayMovements } from "@/lib/finance/calculations";
export type { MonthlyTotals } from "@/lib/finance/carry-forward";
export type { MonthProjection } from "@/lib/finance/projections";
export type {
  AdjustmentDirection,
  CarryForwardRecord,
  CategoryTotal,
  DailyBalance,
  DateKey,
  FinancePlannedExpense,
  FinanceSettings,
  FinanceTransaction,
  LedgerInput,
  MonthAllowance,
  MonthKey,
  MonthlyBudgetConfig,
  MonthlySummary,
  PlannedExpenseStatus,
  SafeToSpend,
  TransactionType,
  WeeklyBreakdown,
} from "@/lib/finance/types";
