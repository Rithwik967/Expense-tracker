import { parseMoney, parseOptionalMoney, toDecimalString, type Money } from "@/lib/finance/money";
import {
  ADJUSTMENT_DIRECTIONS,
  PLANNED_EXPENSE_STATUSES,
  TRANSACTION_TYPES,
  type AdjustmentDirection,
  type DateKey,
  type MonthKey,
  type PlannedExpenseStatus,
  type TransactionType,
} from "@/lib/finance/types";
import { assertDateKey } from "@/lib/utils/dates";
import type {
  AppSettingsRow,
  CategoryRow,
  MonthlyBudgetRow,
  MonthlyTransactionTotalsRow,
  PlannedExpenseRow,
  TransactionRow,
} from "@/types/database";

import { DataError } from "./errors";
import type {
  AppSettingsRecord,
  CategoryRecord,
  MonthlyBudgetRecord,
  MonthlyTotalsRecord,
  PlannedExpenseRecord,
  TransactionRecord,
} from "./types";

/**
 * Database rows in, domain records out.
 *
 * This is the boundary where untrusted shapes become trusted ones. Every
 * `numeric` becomes decimal-safe `Money` here and nowhere else, and the string
 * columns that the schema constrains to a fixed set are re-checked rather than
 * cast, so a hand-edited row cannot smuggle an unknown transaction type into
 * the calculation engine.
 */

function asDateKey(value: string, field: string): DateKey {
  // Postgres `date` arrives as YYYY-MM-DD, but a timestamp would arrive longer.
  const trimmed = value.slice(0, 10);
  try {
    return assertDateKey(trimmed);
  } catch {
    throw DataError.validation(`${field} is not a valid date: "${value}".`);
  }
}

function asMonthKey(value: string, field: string): MonthKey {
  const date = asDateKey(value, field);
  if (!date.endsWith("-01")) {
    throw DataError.validation(`${field} must be the first day of a month, got "${value}".`);
  }
  return date as MonthKey;
}

function asMoney(value: number | string, field: string): Money {
  try {
    return parseMoney(value);
  } catch {
    throw DataError.validation(`${field} is not a valid amount: "${value}".`);
  }
}

function asOneOf<T extends string>(
  value: string,
  allowed: readonly T[],
  field: string,
): T {
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw DataError.validation(`${field} has an unexpected value: "${value}".`);
}

/**
 * Each mapper accepts only the columns it reads, expressed as a `Pick` of the
 * generated row type. Queries deliberately select column subsets, so requiring
 * a whole row here would reject them; naming the fields keeps the mapper honest
 * about its dependencies while still accepting a full row.
 */
export function toAppSettings(
  row: Pick<
    AppSettingsRow,
    | "id"
    | "currency"
    | "default_monthly_budget"
    | "default_daily_allowance"
    | "month_start_day"
    | "updated_at"
  >,
): AppSettingsRecord {
  return {
    id: row.id,
    currency: row.currency,
    defaultMonthlyBudget: asMoney(row.default_monthly_budget, "default_monthly_budget"),
    defaultDailyAllowance: parseOptionalMoney(row.default_daily_allowance),
    monthStartDay: row.month_start_day,
    updatedAt: row.updated_at,
  };
}

export function toCategory(
  row: Pick<CategoryRow, "id" | "name" | "icon" | "description" | "is_active" | "sort_order">,
): CategoryRecord {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    description: row.description,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

export function toMonthlyBudget(
  row: Pick<MonthlyBudgetRow, "id" | "month_start" | "monthly_budget" | "daily_allowance">,
): MonthlyBudgetRecord {
  return {
    id: row.id,
    monthStart: asMonthKey(row.month_start, "month_start"),
    monthlyBudget: asMoney(row.monthly_budget, "monthly_budget"),
    dailyAllowance: parseOptionalMoney(row.daily_allowance),
  };
}

export function toTransaction(
  row: Pick<
    TransactionRow,
    | "id"
    | "transaction_date"
    | "type"
    | "amount"
    | "adjustment_direction"
    | "category_id"
    | "description"
    | "created_at"
    | "updated_at"
  >,
): TransactionRecord {
  const type = asOneOf<TransactionType>(row.type, TRANSACTION_TYPES, "type");
  const direction =
    row.adjustment_direction === null
      ? null
      : asOneOf<AdjustmentDirection>(
          row.adjustment_direction,
          ADJUSTMENT_DIRECTIONS,
          "adjustment_direction",
        );

  if (type === "adjustment" && direction === null) {
    throw DataError.validation("An adjustment is missing its direction.");
  }

  return {
    id: row.id,
    date: asDateKey(row.transaction_date, "transaction_date"),
    type,
    amount: asMoney(row.amount, "amount"),
    adjustmentDirection: direction,
    categoryId: row.category_id,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPlannedExpense(
  row: Pick<
    PlannedExpenseRow,
    | "id"
    | "planned_date"
    | "amount"
    | "category_id"
    | "description"
    | "status"
    | "converted_transaction_id"
    | "created_at"
  >,
): PlannedExpenseRecord {
  return {
    id: row.id,
    plannedDate: asDateKey(row.planned_date, "planned_date"),
    amount: asMoney(row.amount, "amount"),
    categoryId: row.category_id,
    description: row.description,
    status: asOneOf<PlannedExpenseStatus>(row.status, PLANNED_EXPENSE_STATUSES, "status"),
    convertedTransactionId: row.converted_transaction_id,
    createdAt: row.created_at,
  };
}

export function toMonthlyTotals(row: MonthlyTransactionTotalsRow): MonthlyTotalsRecord {
  if (row.month_start === null) {
    throw DataError.validation("A monthly totals row is missing its month.");
  }
  return {
    monthStart: asMonthKey(row.month_start, "month_start"),
    income: asMoney(row.income ?? 0, "income"),
    expenses: asMoney(row.expenses ?? 0, "expenses"),
    creditAdjustments: asMoney(row.credit_adjustments ?? 0, "credit_adjustments"),
    debitAdjustments: asMoney(row.debit_adjustments ?? 0, "debit_adjustments"),
    transactionCount: row.transaction_count ?? 0,
  };
}

/**
 * Money out to the database.
 *
 * Paise are divided by 100 into a JavaScript number, which is exact for the
 * round trip even though the quotient is not exactly representable in binary:
 * IEEE-754 division is correctly rounded, so 29032/100 lands on the float
 * nearest 290.32, and `JSON.stringify` emits the shortest decimal that maps
 * back to that float — "290.32". Postgres then parses that text into
 * `NUMERIC(12,2)` exactly. No precision is lost at any step.
 */
export const moneyToColumn = (value: Money): number => Number(toDecimalString(value));

export const optionalMoneyToColumn = (value: Money | null): number | null =>
  value === null ? null : moneyToColumn(value);
