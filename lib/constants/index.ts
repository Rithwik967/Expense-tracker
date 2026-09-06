import type { AdjustmentDirection, PlannedExpenseStatus, TransactionType } from "@/lib/finance/types";

/**
 * Application constants.
 *
 * Deliberately contains no financial values. Budgets and allowances live in the
 * database (`app_settings`, `monthly_budgets`) so that changing them is a user
 * action rather than a code change — there is no ₹9,000 or ₹300 anywhere in the
 * TypeScript source.
 */

export const APP_NAME = "Daily Budget";
export const APP_DESCRIPTION =
  "A private daily-allowance tracker: spread a monthly budget across the days, carry the balance forward, and see exactly what today is worth.";

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  expense: "Expense",
  income: "Money added",
  adjustment: "Adjustment",
};

export const ADJUSTMENT_DIRECTION_LABELS: Record<AdjustmentDirection, string> = {
  credit: "Adds money",
  debit: "Takes money away",
};

export const PLANNED_STATUS_LABELS: Record<PlannedExpenseStatus, string> = {
  planned: "Planned",
  completed: "Spent",
  cancelled: "Cancelled",
};

/** Chart colours, ordered so adjacent categories stay distinguishable. */
export const CATEGORY_CHART_COLORS = [
  "#0d9488",
  "#6366f1",
  "#f59e0b",
  "#ec4899",
  "#14b8a6",
  "#8b5cf6",
  "#ef4444",
  "#22c55e",
  "#0ea5e9",
  "#a855f7",
] as const;

export const TRANSACTIONS_PAGE_SIZE = 50;

/** Minimum touch target, in pixels. Matches the WCAG 2.2 target-size guidance. */
export const MIN_TOUCH_TARGET_PX = 44;
