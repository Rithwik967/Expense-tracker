import { z } from "zod";

import { parseMoney, type Money } from "@/lib/finance/money";
import { isDateKey, isMonthKey } from "@/lib/utils/dates";

/**
 * Building blocks shared by every schema.
 *
 * Amounts are validated and converted here rather than in a form component, so
 * the same rules apply to a keystroke, an API request and an imported backup.
 */

export const MAX_AMOUNT_RUPEES = 10_000_000;

export const dateKeySchema = z
  .string()
  .refine(isDateKey, { message: "Enter a valid date." });

export const monthKeySchema = z
  .string()
  .refine(isMonthKey, { message: "Enter a valid month." });

/**
 * A user-entered amount, in rupees, transformed into decimal-safe `Money`.
 *
 * Accepts what people actually type — "1,250", " 40.5 ", 300 — and rejects
 * anything that is not a positive amount of money. Parsing goes through the
 * string form so no fractional float ever reaches the calculation engine.
 */
export const positiveAmountSchema = z
  .union([z.string(), z.number()])
  .transform((value, ctx): Money => {
    const raw = typeof value === "number" ? value : value.replace(/[\s,₹]/g, "");

    if (raw === "" || raw === null) {
      ctx.addIssue({ code: "custom", message: "Enter an amount." });
      return z.NEVER;
    }

    let parsed: Money;
    try {
      parsed = parseMoney(raw);
    } catch {
      ctx.addIssue({ code: "custom", message: "Enter a valid amount, for example 250 or 249.50." });
      return z.NEVER;
    }

    if (parsed <= 0) {
      ctx.addIssue({ code: "custom", message: "The amount must be more than ₹0." });
      return z.NEVER;
    }

    if (parsed > MAX_AMOUNT_RUPEES * 100) {
      ctx.addIssue({
        code: "custom",
        message: `That is larger than the ₹${MAX_AMOUNT_RUPEES.toLocaleString("en-IN")} limit.`,
      });
      return z.NEVER;
    }

    return parsed;
  });

/** Like `positiveAmountSchema` but allows exactly zero, for budgets. */
export const nonNegativeAmountSchema = z
  .union([z.string(), z.number()])
  .transform((value, ctx): Money => {
    const raw = typeof value === "number" ? value : value.replace(/[\s,₹]/g, "");

    if (raw === "") {
      ctx.addIssue({ code: "custom", message: "Enter an amount." });
      return z.NEVER;
    }

    let parsed: Money;
    try {
      parsed = parseMoney(raw);
    } catch {
      ctx.addIssue({ code: "custom", message: "Enter a valid amount." });
      return z.NEVER;
    }

    if (parsed < 0) {
      ctx.addIssue({ code: "custom", message: "The amount cannot be negative." });
      return z.NEVER;
    }

    if (parsed > MAX_AMOUNT_RUPEES * 100) {
      ctx.addIssue({
        code: "custom",
        message: `That is larger than the ₹${MAX_AMOUNT_RUPEES.toLocaleString("en-IN")} limit.`,
      });
      return z.NEVER;
    }

    return parsed;
  });

/** Trimmed free text that becomes `null` when empty. */
export const optionalNoteSchema = z
  .string()
  .max(280, "Keep notes under 280 characters.")
  .transform((value) => {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  })
  .nullable()
  .default(null);

export const uuidSchema = z.uuid("That is not a valid id.");
