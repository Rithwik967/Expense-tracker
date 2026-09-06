import { z } from "zod";

import { ADJUSTMENT_DIRECTIONS, TRANSACTION_TYPES } from "@/lib/finance/types";

import {
  dateKeySchema,
  optionalNoteSchema,
  positiveAmountSchema,
  uuidSchema,
} from "./shared";

/**
 * Transaction validation.
 *
 * The rules here mirror the database CHECK constraints exactly, so a form gives
 * an immediate, readable reason rather than bouncing off Postgres. The database
 * remains the backstop: these rules never replace it.
 */

export const transactionTypeSchema = z.enum(TRANSACTION_TYPES);
export const adjustmentDirectionSchema = z.enum(ADJUSTMENT_DIRECTIONS);

const baseTransactionSchema = z.object({
  type: transactionTypeSchema,
  amount: positiveAmountSchema,
  date: dateKeySchema,
  categoryId: uuidSchema.nullable().default(null),
  adjustmentDirection: adjustmentDirectionSchema.nullable().default(null),
  description: optionalNoteSchema,
});

export const transactionInputSchema = baseTransactionSchema.superRefine((value, ctx) => {
  if (value.type === "expense" && !value.categoryId) {
    ctx.addIssue({ code: "custom", path: ["categoryId"], message: "Choose a category." });
  }

  if (value.type === "adjustment" && !value.adjustmentDirection) {
    ctx.addIssue({
      code: "custom",
      path: ["adjustmentDirection"],
      message: "Say whether this adds money or takes it away.",
    });
  }

  // Direction is meaningful only for adjustments; carrying it on other types
  // would let the same amount be interpreted two ways.
  if (value.type !== "adjustment" && value.adjustmentDirection) {
    ctx.addIssue({
      code: "custom",
      path: ["adjustmentDirection"],
      message: "Only adjustments have a direction.",
    });
  }
});

export type TransactionInput = z.output<typeof transactionInputSchema>;

/** Shape of the Add Expense form, before it becomes a transaction. */
export const expenseFormSchema = z.object({
  amount: z.string().min(1, "Enter an amount."),
  categoryId: z.string().min(1, "Choose a category."),
  date: z.string().min(1, "Choose a date."),
  description: z.string().max(280, "Keep notes under 280 characters."),
});
export type ExpenseFormValues = z.input<typeof expenseFormSchema>;

export const incomeFormSchema = z.object({
  amount: z.string().min(1, "Enter an amount."),
  date: z.string().min(1, "Choose a date."),
  description: z.string().max(280, "Keep notes under 280 characters."),
});
export type IncomeFormValues = z.input<typeof incomeFormSchema>;

export const adjustmentFormSchema = z.object({
  amount: z.string().min(1, "Enter an amount."),
  direction: adjustmentDirectionSchema,
  date: z.string().min(1, "Choose a date."),
  description: z.string().max(280, "Keep notes under 280 characters."),
});
export type AdjustmentFormValues = z.input<typeof adjustmentFormSchema>;
