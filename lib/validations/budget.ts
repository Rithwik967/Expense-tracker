import { z } from "zod";

import {
  dateKeySchema,
  monthKeySchema,
  nonNegativeAmountSchema,
  optionalNoteSchema,
  positiveAmountSchema,
  uuidSchema,
} from "./shared";
import { PLANNED_EXPENSE_STATUSES } from "@/lib/finance/types";

/** Budget, settings and planned-expense validation. */

export const monthlyBudgetInputSchema = z.object({
  monthStart: monthKeySchema,
  monthlyBudget: nonNegativeAmountSchema,
  /**
   * `null` means "derive the allowance from the budget". An explicit value is
   * honoured verbatim, and the resulting gap against the budget is reported to
   * the user rather than absorbed silently.
   */
  dailyAllowance: nonNegativeAmountSchema.nullable().default(null),
});
export type MonthlyBudgetInput = z.output<typeof monthlyBudgetInputSchema>;

export const settingsInputSchema = z.object({
  currency: z.string().trim().min(1, "Choose a currency.").max(8).optional(),
  defaultMonthlyBudget: nonNegativeAmountSchema.optional(),
  defaultDailyAllowance: nonNegativeAmountSchema.nullable().optional(),
  monthStartDay: z
    .number()
    .int("Choose a whole day of the month.")
    .min(1, "The month start day must be between 1 and 28.")
    .max(28, "The month start day must be between 1 and 28.")
    .optional(),
});
export type SettingsInput = z.output<typeof settingsInputSchema>;

export const plannedExpenseStatusSchema = z.enum(PLANNED_EXPENSE_STATUSES);

export const plannedExpenseInputSchema = z.object({
  plannedDate: dateKeySchema,
  amount: positiveAmountSchema,
  categoryId: uuidSchema.nullable().default(null),
  description: optionalNoteSchema,
  status: plannedExpenseStatusSchema.default("planned"),
});
export type PlannedExpenseInput = z.output<typeof plannedExpenseInputSchema>;

export const plannedExpensePatchSchema = plannedExpenseInputSchema.partial();
export type PlannedExpensePatch = z.output<typeof plannedExpensePatchSchema>;

/** Form shapes, kept as strings so React Hook Form can own the raw input. */
export const budgetFormSchema = z.object({
  monthlyBudget: z.string().min(1, "Enter a monthly budget."),
  dailyAllowance: z.string(),
  useDerivedAllowance: z.boolean(),
});
export type BudgetFormValues = z.input<typeof budgetFormSchema>;

export const plannedExpenseFormSchema = z.object({
  amount: z.string().min(1, "Enter an amount."),
  categoryId: z.string(),
  plannedDate: z.string().min(1, "Choose a date."),
  description: z.string().max(280, "Keep it under 280 characters."),
});
export type PlannedExpenseFormValues = z.input<typeof plannedExpenseFormSchema>;
