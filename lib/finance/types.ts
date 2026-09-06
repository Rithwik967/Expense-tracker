import type { Money } from "./money";

declare const dateKeyBrand: unique symbol;
declare const monthKeyBrand: unique symbol;

/** A calendar day, `YYYY-MM-DD`. */
export type DateKey = string & { readonly [dateKeyBrand]?: "DateKey" };

/** The first day of a calendar month, `YYYY-MM-01`. */
export type MonthKey = DateKey & { readonly [monthKeyBrand]?: "MonthKey" };

export const TRANSACTION_TYPES = ["expense", "income", "adjustment"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const ADJUSTMENT_DIRECTIONS = ["credit", "debit"] as const;
export type AdjustmentDirection = (typeof ADJUSTMENT_DIRECTIONS)[number];

export const PLANNED_EXPENSE_STATUSES = ["planned", "completed", "cancelled"] as const;
export type PlannedExpenseStatus = (typeof PLANNED_EXPENSE_STATUSES)[number];

/**
 * A transaction as the calculation engine sees it: amounts already parsed into
 * decimal-safe `Money`, dates already normalised to `DateKey`.
 */
export interface FinanceTransaction {
  readonly id: string;
  readonly date: DateKey;
  readonly type: TransactionType;
  readonly amount: Money;
  readonly adjustmentDirection: AdjustmentDirection | null;
  readonly categoryId: string | null;
  readonly description: string | null;
}

export interface FinancePlannedExpense {
  readonly id: string;
  readonly plannedDate: DateKey;
  readonly amount: Money;
  readonly categoryId: string | null;
  readonly description: string | null;
  readonly status: PlannedExpenseStatus;
}

/** Per-month budget configuration. `dailyAllowance === null` means "derive it". */
export interface MonthlyBudgetConfig {
  readonly monthStart: MonthKey;
  readonly monthlyBudget: Money;
  readonly dailyAllowance: Money | null;
}

export interface FinanceSettings {
  readonly currency: string;
  readonly defaultMonthlyBudget: Money;
  readonly defaultDailyAllowance: Money | null;
  readonly monthStartDay: number;
}

/**
 * The resolved allowance rules for one month.
 *
 * `perDay` is the headline figure shown in the UI. `allocatedTotal` is what the
 * month actually accrues once the remainder has been distributed across days,
 * and `variance` records any gap between that and `monthlyBudget` so an
 * explicit override never silently creates or destroys money.
 */
export interface MonthAllowance {
  readonly month: MonthKey;
  readonly monthlyBudget: Money;
  readonly daysInMonth: number;
  readonly perDay: Money;
  readonly allocatedTotal: Money;
  readonly variance: Money;
  readonly isExplicitOverride: boolean;
}

export interface DailyBalance {
  readonly date: DateKey;
  readonly startingBalance: Money;
  readonly dailyAllowance: Money;
  readonly income: Money;
  readonly expenses: Money;
  readonly creditAdjustments: Money;
  readonly debitAdjustments: Money;
  readonly endingBalance: Money;
  /**
   * Discretionary spending for the day. Deliberately equal to `expenses`:
   * adjustments are bookkeeping corrections, not spending, and every screen
   * must agree on a single definition of "spent".
   */
  readonly totalSpent: Money;
  readonly transactionCount: number;
}

export interface MonthlySummary {
  readonly month: MonthKey;
  readonly monthlyBudget: Money;
  readonly dailyAllowance: Money;
  readonly daysInMonth: number;
  /** Closing balance of the previous month; may be negative. */
  readonly carryForward: Money;
  readonly totalIncome: Money;
  readonly totalExpenses: Money;
  /** Signed: credit adjustments minus debit adjustments. */
  readonly totalAdjustments: Money;
  readonly totalSpent: Money;
  /** Ending balance as of `asOf` (clamped to this month). */
  readonly currentBalance: Money;
  /** Closing balance on the last day, including transactions dated in the future. */
  readonly projectedEndBalance: Money;
  /** Unused capacity carried *into* this month. Never negative. */
  readonly extraMoney: Money;
  readonly allowanceAccruedToDate: Money;
  readonly allowanceTotal: Money;
  /** Non-zero only when an explicit daily allowance disagrees with the budget. */
  readonly allowanceVariance: Money;
  readonly transactionCount: number;
  readonly asOf: DateKey;
  readonly isComplete: boolean;
}

export interface SafeToSpend {
  readonly date: DateKey;
  readonly availableBalance: Money;
  readonly reservedForPlanned: Money;
  readonly safeToSpend: Money;
  readonly plannedExpenseCount: number;
  readonly horizonEnd: DateKey;
}

export interface CategoryTotal {
  readonly categoryId: string | null;
  readonly amount: Money;
  readonly transactionCount: number;
  readonly percentage: number;
}

export interface WeeklyBreakdown {
  readonly weekNumber: number;
  readonly start: DateKey;
  readonly end: DateKey;
  readonly days: number;
  readonly allowanceGenerated: Money;
  readonly spent: Money;
  /** `allowanceGenerated - spent`. Negative means the week overspent. */
  readonly difference: Money;
}

export interface CarryForwardRecord {
  readonly month: MonthKey;
  readonly closingBalance: Money;
  readonly carriedIntoNextMonth: Money;
  readonly extraMoney: Money;
}

/** Everything the engine needs. Pure data — no React, no Supabase. */
export interface LedgerInput {
  readonly settings: FinanceSettings;
  readonly budgets: readonly MonthlyBudgetConfig[];
  readonly transactions: readonly FinanceTransaction[];
  readonly plannedExpenses?: readonly FinancePlannedExpense[];
  /**
   * Balance carried into `anchorMonth`. Lets the data layer replace a long
   * history of rows with a single pre-aggregated figure without changing any
   * result. Defaults to zero.
   */
  readonly openingBalance?: Money;
  /**
   * First month the ledger simulates. Defaults to the earliest month present in
   * `budgets` or `transactions`.
   */
  readonly anchorMonth?: MonthKey;
}
