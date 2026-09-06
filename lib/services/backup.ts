import "server-only";

import { z } from "zod";

import { DataError } from "@/lib/data/errors";
import type { BackupPayload, CategoryRecord, TransactionRecord } from "@/lib/data/types";
import { toDecimalString, type Money } from "@/lib/finance/money";
import {
  ADJUSTMENT_DIRECTIONS,
  PLANNED_EXPENSE_STATUSES,
  TRANSACTION_TYPES,
} from "@/lib/finance/types";
import { formatMonthLabel } from "@/lib/utils/formatting";
import {
  dateKeySchema,
  monthKeySchema,
  nonNegativeAmountSchema,
  positiveAmountSchema,
  uuidSchema,
} from "@/lib/validations/shared";

/**
 * Export and import.
 *
 * An imported file is untrusted input. It is validated structurally, then
 * checked for referential problems an individual row cannot reveal — an expense
 * pointing at a category that is not in the file, two categories sharing a name,
 * a plan linked to a transaction that does not exist. Nothing is written until
 * the whole file passes, so a bad import cannot leave the data half-replaced.
 */

export const BACKUP_FORMAT = "spending-tracker-backup";
export const BACKUP_VERSION = 1;

const backupSettingsSchema = z.object({
  currency: z.string().trim().min(1).max(8),
  defaultMonthlyBudget: nonNegativeAmountSchema,
  defaultDailyAllowance: nonNegativeAmountSchema.nullable(),
  monthStartDay: z.number().int().min(1).max(28),
});

const backupCategorySchema = z.object({
  id: uuidSchema,
  name: z.string().trim().min(1).max(48),
  icon: z.string().nullable(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
});

const backupBudgetSchema = z.object({
  id: uuidSchema,
  monthStart: monthKeySchema,
  monthlyBudget: nonNegativeAmountSchema,
  dailyAllowance: nonNegativeAmountSchema.nullable(),
});

const backupTransactionSchema = z.object({
  id: uuidSchema,
  date: dateKeySchema,
  type: z.enum(TRANSACTION_TYPES),
  amount: positiveAmountSchema,
  adjustmentDirection: z.enum(ADJUSTMENT_DIRECTIONS).nullable(),
  categoryId: uuidSchema.nullable(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const backupPlannedSchema = z.object({
  id: uuidSchema,
  plannedDate: dateKeySchema,
  amount: positiveAmountSchema,
  categoryId: uuidSchema.nullable(),
  description: z.string().nullable(),
  status: z.enum(PLANNED_EXPENSE_STATUSES),
  convertedTransactionId: uuidSchema.nullable(),
  createdAt: z.string(),
});

export const backupFileSchema = z.object({
  format: z.literal(BACKUP_FORMAT, {
    message: "That file is not a spending tracker backup.",
  }),
  version: z.number().int().max(BACKUP_VERSION, {
    message: "That backup was written by a newer version of the app.",
  }),
  exportedAt: z.string().optional(),
  data: z.object({
    settings: backupSettingsSchema,
    categories: z.array(backupCategorySchema),
    monthlyBudgets: z.array(backupBudgetSchema),
    transactions: z.array(backupTransactionSchema),
    plannedExpenses: z.array(backupPlannedSchema),
  }),
});

export interface BackupSummary {
  readonly categories: number;
  readonly monthlyBudgets: number;
  readonly transactions: number;
  readonly plannedExpenses: number;
  readonly earliestTransaction: string | null;
  readonly latestTransaction: string | null;
  readonly currency: string;
  readonly monthsCovered: readonly string[];
}

export function buildBackupFile(payload: BackupPayload) {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      settings: {
        currency: payload.settings.currency,
        defaultMonthlyBudget: toDecimalString(payload.settings.defaultMonthlyBudget),
        defaultDailyAllowance: optionalDecimal(payload.settings.defaultDailyAllowance),
        monthStartDay: payload.settings.monthStartDay,
      },
      categories: payload.categories,
      monthlyBudgets: payload.monthlyBudgets.map((budget) => ({
        ...budget,
        monthlyBudget: toDecimalString(budget.monthlyBudget),
        dailyAllowance: optionalDecimal(budget.dailyAllowance),
      })),
      transactions: payload.transactions.map((transaction) => ({
        ...transaction,
        amount: toDecimalString(transaction.amount),
      })),
      plannedExpenses: payload.plannedExpenses.map((planned) => ({
        ...planned,
        amount: toDecimalString(planned.amount),
      })),
    },
  };
}

function optionalDecimal(value: Money | null): string | null {
  return value === null ? null : toDecimalString(value);
}

/**
 * Validate a candidate backup and report what it contains.
 *
 * Returns the parsed payload plus a summary the UI shows before asking the user
 * to confirm, so an import is never a blind replacement.
 */
export function parseBackupFile(input: unknown): {
  payload: BackupPayload;
  summary: BackupSummary;
} {
  const parsed = backupFileSchema.parse(input);
  const { data } = parsed;

  const categoryIds = new Set(data.categories.map((category) => category.id));
  const transactionIds = new Set(data.transactions.map((transaction) => transaction.id));

  assertUniqueIds(data.categories.map((c) => c.id), "categories");
  assertUniqueIds(data.transactions.map((t) => t.id), "transactions");
  assertUniqueIds(data.monthlyBudgets.map((b) => b.id), "budgets");
  assertUniqueIds(data.plannedExpenses.map((p) => p.id), "planned expenses");

  const duplicateName = findDuplicateName(data.categories);
  if (duplicateName) {
    throw DataError.validation(
      `The backup has two categories called "${duplicateName}". Category names must be unique.`,
    );
  }

  const duplicateMonth = findDuplicate(data.monthlyBudgets.map((budget) => budget.monthStart));
  if (duplicateMonth) {
    throw DataError.validation(
      `The backup has two budgets for ${formatMonthLabel(duplicateMonth)}.`,
    );
  }

  for (const transaction of data.transactions) {
    if (transaction.type === "expense" && !transaction.categoryId) {
      throw DataError.validation(
        `An expense dated ${transaction.date} in the backup has no category.`,
      );
    }
    if (transaction.type === "adjustment" && !transaction.adjustmentDirection) {
      throw DataError.validation(
        `An adjustment dated ${transaction.date} in the backup has no direction.`,
      );
    }
    if (transaction.type !== "adjustment" && transaction.adjustmentDirection) {
      throw DataError.validation(
        `A ${transaction.type} dated ${transaction.date} in the backup has an adjustment direction.`,
      );
    }
    if (transaction.categoryId && !categoryIds.has(transaction.categoryId)) {
      throw DataError.validation(
        `A transaction dated ${transaction.date} refers to a category that is not in the backup.`,
      );
    }
  }

  const linkedTransactions = new Set<string>();
  for (const planned of data.plannedExpenses) {
    if (planned.categoryId && !categoryIds.has(planned.categoryId)) {
      throw DataError.validation(
        `A planned expense dated ${planned.plannedDate} refers to a category that is not in the backup.`,
      );
    }
    if (planned.convertedTransactionId) {
      if (!transactionIds.has(planned.convertedTransactionId)) {
        throw DataError.validation(
          `A planned expense dated ${planned.plannedDate} is linked to a transaction that is not in the backup.`,
        );
      }
      if (linkedTransactions.has(planned.convertedTransactionId)) {
        throw DataError.validation(
          "Two planned expenses in the backup are linked to the same transaction.",
        );
      }
      linkedTransactions.add(planned.convertedTransactionId);
    }
  }

  const dates = data.transactions.map((transaction) => transaction.date).sort();
  const months = [...new Set(dates.map((date) => date.slice(0, 7)))].sort();

  const payload: BackupPayload = {
    settings: {
      id: "",
      currency: data.settings.currency,
      defaultMonthlyBudget: data.settings.defaultMonthlyBudget,
      defaultDailyAllowance: data.settings.defaultDailyAllowance,
      monthStartDay: data.settings.monthStartDay,
      updatedAt: new Date().toISOString(),
    },
    categories: data.categories,
    monthlyBudgets: data.monthlyBudgets,
    transactions: data.transactions as unknown as TransactionRecord[],
    plannedExpenses: data.plannedExpenses,
  };

  return {
    payload,
    summary: {
      categories: data.categories.length,
      monthlyBudgets: data.monthlyBudgets.length,
      transactions: data.transactions.length,
      plannedExpenses: data.plannedExpenses.length,
      earliestTransaction: dates[0] ?? null,
      latestTransaction: dates[dates.length - 1] ?? null,
      currency: data.settings.currency,
      monthsCovered: months,
    },
  };
}

function assertUniqueIds(ids: string[], label: string): void {
  const duplicate = findDuplicate(ids);
  if (duplicate) {
    throw DataError.validation(`The backup has two ${label} sharing the id ${duplicate}.`);
  }
}

function findDuplicate(values: string[]): string | null {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return null;
}

function findDuplicateName(categories: Array<Pick<CategoryRecord, "name">>): string | null {
  const seen = new Set<string>();
  for (const category of categories) {
    const key = category.name.trim().toLowerCase();
    if (seen.has(key)) return category.name;
    seen.add(key);
  }
  return null;
}

/** Transaction CSV, for opening the data in a spreadsheet. */
export function buildTransactionCsv(
  transactions: readonly TransactionRecord[],
  categories: readonly CategoryRecord[],
): string {
  const nameById = new Map(categories.map((category) => [category.id, category.name]));
  const header = ["Date", "Type", "Direction", "Category", "Description", "Amount"];

  const rows = transactions.map((transaction) => [
    transaction.date,
    transaction.type,
    transaction.adjustmentDirection ?? "",
    transaction.categoryId ? (nameById.get(transaction.categoryId) ?? "") : "",
    transaction.description ?? "",
    toDecimalString(transaction.amount),
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

/**
 * Quote a CSV cell.
 *
 * A leading `=`, `+`, `-` or `@` is prefixed with an apostrophe: spreadsheet
 * applications treat those as the start of a formula, so a description a user
 * typed could otherwise execute when the export is opened.
 */
function escapeCsvCell(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${guarded.replace(/"/g, '""')}"`;
}
