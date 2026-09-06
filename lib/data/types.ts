import type { Money } from "@/lib/finance/money";
import type {
  AdjustmentDirection,
  DateKey,
  MonthKey,
  PlannedExpenseStatus,
  TransactionType,
} from "@/lib/finance/types";

/**
 * Domain records.
 *
 * These are what the rest of the application sees. Every `numeric` column has
 * already been converted to decimal-safe `Money` and every `date` column to a
 * `DateKey`, so no consumer ever handles a raw database value.
 */

export interface AppSettingsRecord {
  readonly id: string;
  readonly currency: string;
  readonly defaultMonthlyBudget: Money;
  readonly defaultDailyAllowance: Money | null;
  readonly monthStartDay: number;
  readonly updatedAt: string;
}

export interface CategoryRecord {
  readonly id: string;
  readonly name: string;
  readonly icon: string | null;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly sortOrder: number;
}

export interface MonthlyBudgetRecord {
  readonly id: string;
  readonly monthStart: MonthKey;
  readonly monthlyBudget: Money;
  readonly dailyAllowance: Money | null;
}

export interface TransactionRecord {
  readonly id: string;
  readonly date: DateKey;
  readonly type: TransactionType;
  readonly amount: Money;
  readonly adjustmentDirection: AdjustmentDirection | null;
  readonly categoryId: string | null;
  readonly description: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PlannedExpenseRecord {
  readonly id: string;
  readonly plannedDate: DateKey;
  readonly amount: Money;
  readonly categoryId: string | null;
  readonly description: string | null;
  readonly status: PlannedExpenseStatus;
  readonly convertedTransactionId: string | null;
  readonly createdAt: string;
}

/** Aggregate row from `monthly_transaction_totals`. */
export interface MonthlyTotalsRecord {
  readonly monthStart: MonthKey;
  readonly income: Money;
  readonly expenses: Money;
  readonly creditAdjustments: Money;
  readonly debitAdjustments: Money;
  readonly transactionCount: number;
}

export interface TransactionFilter {
  readonly from?: DateKey;
  readonly to?: DateKey;
  readonly types?: readonly TransactionType[];
  readonly categoryIds?: readonly string[];
  readonly search?: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly sort?: "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
}

export interface PlannedExpenseFilter {
  readonly from?: DateKey;
  readonly to?: DateKey;
  readonly statuses?: readonly PlannedExpenseStatus[];
}

export interface TransactionWriteInput {
  readonly date: DateKey;
  readonly type: TransactionType;
  readonly amount: Money;
  readonly adjustmentDirection: AdjustmentDirection | null;
  readonly categoryId: string | null;
  readonly description: string | null;
}

export interface PlannedExpenseWriteInput {
  readonly plannedDate: DateKey;
  readonly amount: Money;
  readonly categoryId: string | null;
  readonly description: string | null;
  readonly status: PlannedExpenseStatus;
}

export interface CategoryWriteInput {
  readonly name: string;
  readonly icon: string | null;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly sortOrder: number;
}

export interface SettingsWriteInput {
  readonly currency?: string;
  readonly defaultMonthlyBudget?: Money;
  readonly defaultDailyAllowance?: Money | null;
  readonly monthStartDay?: number;
}

export interface MonthlyBudgetWriteInput {
  readonly monthStart: MonthKey;
  readonly monthlyBudget: Money;
  readonly dailyAllowance: Money | null;
}

/** A complete, restorable snapshot of everything the user owns. */
export interface BackupPayload {
  readonly settings: AppSettingsRecord;
  readonly categories: readonly CategoryRecord[];
  readonly monthlyBudgets: readonly MonthlyBudgetRecord[];
  readonly transactions: readonly TransactionRecord[];
  readonly plannedExpenses: readonly PlannedExpenseRecord[];
}

/**
 * The only interface the rest of the app talks to for persistence.
 *
 * Two implementations exist: Supabase, and an on-disk store used when no
 * Supabase project is configured so the app is runnable out of the box. Both
 * satisfy the same contract and both go through the same Zod validation, so
 * behaviour does not diverge.
 */
export interface DataRepository {
  readonly backend: "supabase" | "local";

  getSettings(): Promise<AppSettingsRecord>;
  updateSettings(patch: SettingsWriteInput): Promise<AppSettingsRecord>;

  listCategories(): Promise<CategoryRecord[]>;
  createCategory(input: CategoryWriteInput): Promise<CategoryRecord>;
  updateCategory(id: string, patch: Partial<CategoryWriteInput>): Promise<CategoryRecord>;
  reorderCategories(orderedIds: readonly string[]): Promise<CategoryRecord[]>;

  listMonthlyBudgets(): Promise<MonthlyBudgetRecord[]>;
  upsertMonthlyBudget(input: MonthlyBudgetWriteInput): Promise<MonthlyBudgetRecord>;

  listTransactions(filter?: TransactionFilter): Promise<TransactionRecord[]>;
  countTransactions(filter?: TransactionFilter): Promise<number>;
  getTransaction(id: string): Promise<TransactionRecord | null>;
  createTransaction(input: TransactionWriteInput): Promise<TransactionRecord>;
  updateTransaction(id: string, patch: TransactionWriteInput): Promise<TransactionRecord>;
  deleteTransaction(id: string): Promise<void>;

  listPlannedExpenses(filter?: PlannedExpenseFilter): Promise<PlannedExpenseRecord[]>;
  getPlannedExpense(id: string): Promise<PlannedExpenseRecord | null>;
  createPlannedExpense(input: PlannedExpenseWriteInput): Promise<PlannedExpenseRecord>;
  updatePlannedExpense(
    id: string,
    patch: Partial<PlannedExpenseWriteInput> & { convertedTransactionId?: string | null },
  ): Promise<PlannedExpenseRecord>;
  deletePlannedExpense(id: string): Promise<void>;

  /**
   * Per-month transaction sums for months strictly before `beforeMonth`.
   *
   * Lets a month's opening balance be derived without downloading every
   * historical row, because the order of transactions inside a month cannot
   * change that month's closing balance.
   */
  listMonthlyTotalsBefore(beforeMonth: MonthKey): Promise<MonthlyTotalsRecord[]>;

  /** Earliest month that holds a budget or a transaction, if any. */
  getEarliestActivityMonth(): Promise<MonthKey | null>;

  exportAll(): Promise<BackupPayload>;
  replaceAll(payload: BackupPayload): Promise<void>;
  resetAll(): Promise<void>;
}
