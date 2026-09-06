import { parseMoney, type Money } from "./money";
import type {
  AdjustmentDirection,
  DateKey,
  FinancePlannedExpense,
  FinanceSettings,
  FinanceTransaction,
  LedgerInput,
  MonthKey,
  MonthlyBudgetConfig,
  PlannedExpenseStatus,
} from "./types";

/**
 * Builders for the calculation tests. Kept beside the engine (rather than in a
 * test folder) so the fixtures stay in step with the domain types.
 */

export const rupees = (amount: number | string): Money => parseMoney(amount);

export const TEST_SETTINGS: FinanceSettings = {
  currency: "INR",
  defaultMonthlyBudget: rupees(9000),
  defaultDailyAllowance: null,
  monthStartDay: 1,
};

let sequence = 0;
const nextId = (prefix: string) => `${prefix}-${(sequence += 1)}`;

export function budget(
  monthStart: MonthKey,
  monthlyBudget: number | string = 9000,
  dailyAllowance: number | string | null = null,
): MonthlyBudgetConfig {
  return {
    monthStart,
    monthlyBudget: rupees(monthlyBudget),
    dailyAllowance: dailyAllowance === null ? null : rupees(dailyAllowance),
  };
}

export function expense(
  date: DateKey,
  amount: number | string,
  options: { id?: string; categoryId?: string; description?: string } = {},
): FinanceTransaction {
  return {
    id: options.id ?? nextId("exp"),
    date,
    type: "expense",
    amount: rupees(amount),
    adjustmentDirection: null,
    categoryId: options.categoryId ?? "category-food",
    description: options.description ?? null,
  };
}

export function income(
  date: DateKey,
  amount: number | string,
  options: { id?: string; description?: string } = {},
): FinanceTransaction {
  return {
    id: options.id ?? nextId("inc"),
    date,
    type: "income",
    amount: rupees(amount),
    adjustmentDirection: null,
    categoryId: null,
    description: options.description ?? null,
  };
}

export function adjustment(
  date: DateKey,
  amount: number | string,
  direction: AdjustmentDirection,
  options: { id?: string; description?: string } = {},
): FinanceTransaction {
  return {
    id: options.id ?? nextId("adj"),
    date,
    type: "adjustment",
    amount: rupees(amount),
    adjustmentDirection: direction,
    categoryId: null,
    description: options.description ?? null,
  };
}

export function planned(
  plannedDate: DateKey,
  amount: number | string,
  options: { id?: string; status?: PlannedExpenseStatus; categoryId?: string } = {},
): FinancePlannedExpense {
  return {
    id: options.id ?? nextId("plan"),
    plannedDate,
    amount: rupees(amount),
    categoryId: options.categoryId ?? "category-fun",
    description: null,
    status: options.status ?? "planned",
  };
}

export function ledgerInput(overrides: Partial<LedgerInput> = {}): LedgerInput {
  return {
    settings: TEST_SETTINGS,
    budgets: [budget("2026-09-01")],
    transactions: [],
    plannedExpenses: [],
    ...overrides,
  };
}
