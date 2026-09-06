import { toDecimalString, toMajorNumber, type Money } from "@/lib/finance/money";

/**
 * Currency presentation.
 *
 * The only place `Money` is turned into something a person reads. Formatting
 * happens at the very end of the pipeline so no rounded string ever finds its
 * way back into a calculation.
 */

const LOCALE_BY_CURRENCY: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
};

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${currency}:${JSON.stringify(options)}`;
  const cached = formatterCache.get(key);
  if (cached) return cached;

  const locale = LOCALE_BY_CURRENCY[currency] ?? "en-IN";
  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat(locale, { style: "currency", currency, ...options });
  } catch {
    // An unrecognised currency code should not take a screen down.
    formatter = new Intl.NumberFormat(locale, { style: "currency", currency: "INR", ...options });
  }

  formatterCache.set(key, formatter);
  return formatter;
}

export interface CurrencyFormatOptions {
  /** Show paise. Off by default — most amounts are whole rupees. */
  readonly withDecimals?: boolean;
  /** Prefix positive values with "+". Useful for deltas. */
  readonly signed?: boolean;
}

/**
 * Format an amount for display, e.g. `-₹350` or `₹9,000.00`.
 *
 * Rounds to two decimals for display only; the underlying `Money` is untouched.
 */
export function formatCurrency(
  value: Money,
  currency = "INR",
  options: CurrencyFormatOptions = {},
): string {
  const { withDecimals = false, signed = false } = options;
  const hasPaise = value % 100 !== 0;
  const fractionDigits = withDecimals || hasPaise ? 2 : 0;

  const formatted = getFormatter(currency, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  }).format(toMajorNumber(value));

  if (signed && value > 0) return `+${formatted}`;
  return formatted;
}

/** Compact form for chart axes and dense lists: `₹9k`, `₹1.2L`. */
export function formatCompactCurrency(value: Money, currency = "INR"): string {
  const symbol = currencySymbol(currency);
  const major = Math.abs(toMajorNumber(value));
  const sign = value < 0 ? "-" : "";

  if (currency === "INR") {
    // Indian grouping: a lakh is 100,000 and a crore is 10,000,000.
    if (major >= 10_000_000) return `${sign}${symbol}${trim(major / 10_000_000)}Cr`;
    if (major >= 100_000) return `${sign}${symbol}${trim(major / 100_000)}L`;
    if (major >= 1_000) return `${sign}${symbol}${trim(major / 1_000)}k`;
  } else {
    if (major >= 1_000_000) return `${sign}${symbol}${trim(major / 1_000_000)}M`;
    if (major >= 1_000) return `${sign}${symbol}${trim(major / 1_000)}k`;
  }

  return `${sign}${symbol}${trim(major)}`;
}

function trim(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function currencySymbol(currency = "INR"): string {
  try {
    const parts = new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency] ?? "en-IN", {
      style: "currency",
      currency,
    }).formatToParts(0);
    return parts.find((part) => part.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}

/** Plain number for a form field, e.g. `290.32`. No symbol, no grouping. */
export function toAmountInputValue(value: Money): string {
  return toDecimalString(value);
}

export const SUPPORTED_CURRENCIES = [
  { code: "INR", label: "Indian Rupee (₹)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "Pound Sterling (£)" },
] as const;
