import { z } from "zod";

import {
  ADJUSTMENT_DIRECTIONS,
  TRANSACTION_TYPES,
  type AdjustmentDirection,
  type TransactionType,
} from "@/lib/finance/types";

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

/**
 * The rules that involve more than one field.
 *
 * Kept as a plain function rather than living only inside a Zod refinement
 * because a partial edit has to be checked *after* it is merged onto the stored
 * row — sending `{ amount }` alone must not be rejected for having no category,
 * and must still be rejected if the merged result is an expense without one.
 *
 * Returns a field-keyed map so the same messages can land on the same inputs
 * whether they came from a create or an edit. Empty means valid.
 */
export function findTransactionShapeErrors(value: {
  type: TransactionType;
  categoryId: string | null;
  adjustmentDirection: AdjustmentDirection | null;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (value.type === "expense" && !value.categoryId) {
    errors.categoryId = "Choose a category.";
  }

  if (value.type === "adjustment" && !value.adjustmentDirection) {
    errors.adjustmentDirection = "Say whether this adds money or takes it away.";
  }

  // Direction is meaningful only for adjustments; carrying it on other types
  // would let the same amount be interpreted two ways.
  if (value.type !== "adjustment" && value.adjustmentDirection) {
    errors.adjustmentDirection = "Only adjustments have a direction.";
  }

  return errors;
}

export const transactionInputSchema = baseTransactionSchema.superRefine((value, ctx) => {
  for (const [path, message] of Object.entries(findTransactionShapeErrors(value))) {
    ctx.addIssue({ code: "custom", path: [path], message });
  }
});

export type TransactionInput = z.output<typeof transactionInputSchema>;

/**
 * A partial edit.
 *
 * Only the fields present are changed; the cross-field rules are applied to the
 * merged result by the route handler, since neither this schema nor the caller
 * can see the row being edited.
 */
export const transactionPatchSchema = z.object({
  type: transactionTypeSchema.optional(),
  amount: positiveAmountSchema.optional(),
  date: dateKeySchema.optional(),
  categoryId: uuidSchema.nullable().optional(),
  adjustmentDirection: adjustmentDirectionSchema.nullable().optional(),
  description: optionalNoteSchema.optional(),
});

export type TransactionPatch = z.output<typeof transactionPatchSchema>;

/**
 * The Add/Edit Transaction form.
 *
 * One schema covers all three types rather than three near-identical ones,
 * because the form itself is one screen: switching the type reveals or hides a
 * field, it does not start a different flow. Values stay as strings so React
 * Hook Form owns the raw input and the user's "1,250" is never mangled before
 * `positiveAmountSchema` gets to interpret it.
 */
export const transactionFormSchema = z
  .object({
    type: transactionTypeSchema,
    amount: z.string().min(1, "Enter an amount."),
    categoryId: z.string(),
    /** Empty string is the "not chosen yet" state of the direction control. */
    adjustmentDirection: z.union([adjustmentDirectionSchema, z.literal("")]),
    date: dateKeySchema,
    description: z.string().max(280, "Keep notes under 280 characters."),
  })
  .superRefine((value, ctx) => {
    const amount = positiveAmountSchema.safeParse(value.amount);
    if (!amount.success) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: amount.error.issues[0]?.message ?? "Enter a valid amount.",
      });
    }

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
  });

export type TransactionFormValues = z.input<typeof transactionFormSchema>;

/**
 * Form values as the API expects them.
 *
 * Fields that do not apply to the chosen type are dropped rather than sent
 * empty, so an expense can never arrive carrying an adjustment direction.
 */
export function toTransactionPayload(values: TransactionFormValues) {
  return {
    type: values.type,
    amount: values.amount,
    date: values.date,
    categoryId: values.type === "expense" ? values.categoryId : (values.categoryId || null),
    adjustmentDirection: values.type === "adjustment" ? values.adjustmentDirection || null : null,
    description: values.description,
  };
}
