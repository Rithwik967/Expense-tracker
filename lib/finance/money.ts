/**
 * Decimal-safe money.
 *
 * Every amount in this application is carried as an integer number of minor
 * units (paise for INR). `0.1 + 0.2` problems cannot occur because no rupee
 * value is ever represented as a fractional JavaScript number: parsing happens
 * on the decimal *string* that Postgres returns for a NUMERIC column, and every
 * subsequent operation is integer arithmetic.
 *
 * Values stay well inside `Number.MAX_SAFE_INTEGER`: a ten-million-rupee
 * balance is only 10^9 paise.
 */

declare const moneyBrand: unique symbol;

/** An integer count of minor currency units (paise). */
export type Money = number & { readonly [moneyBrand]: "Money" };

export const MINOR_UNITS_PER_MAJOR = 100;

export const ZERO = 0 as Money;

/** Largest amount we accept, to keep every intermediate sum exact. */
const MAX_MINOR = 1_000_000_000_000;

function assertSafe(minor: number): void {
  if (!Number.isFinite(minor) || !Number.isInteger(minor)) {
    throw new Error(`Money must be an integer number of minor units, got ${minor}.`);
  }
  if (Math.abs(minor) > MAX_MINOR) {
    throw new Error(`Money value ${minor} is outside the supported range.`);
  }
}

/** Build a `Money` from an integer count of minor units. */
export function fromMinor(minor: number): Money {
  assertSafe(minor);
  return minor as Money;
}

export function toMinor(value: Money): number {
  return value;
}

/** Exact major-unit value as a number. Only safe for display and charting. */
export function toMajorNumber(value: Money): number {
  return value / MINOR_UNITS_PER_MAJOR;
}

/**
 * Parse a decimal string such as `"9000.00"`, `"-350.5"` or `"290.325"`.
 *
 * Digits beyond two decimal places are rounded half-away-from-zero, matching
 * the behaviour of Postgres when casting to `NUMERIC(12,2)`.
 */
export function parseMoney(input: string | number): Money {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) {
      throw new Error(`Cannot parse ${input} as an amount.`);
    }
    // Route through a fixed-precision string so binary float dust is discarded
    // at a defined boundary rather than accumulating silently.
    return parseMoney(input.toFixed(4));
  }

  const trimmed = input.trim();
  if (trimmed === "") {
    throw new Error("Cannot parse an empty string as an amount.");
  }

  const match = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(trimmed);
  if (!match || (match[2] === "" && (match[3] ?? "") === "")) {
    throw new Error(`Cannot parse "${input}" as an amount.`);
  }

  const [, sign, whole, fractionRaw = ""] = match;
  const fraction = fractionRaw.padEnd(3, "0");
  const units = Number(whole || "0");
  const hundredths = Number(fraction.slice(0, 2) || "0");
  const thousandths = Number(fraction.slice(2, 3) || "0");

  let minor = units * MINOR_UNITS_PER_MAJOR + hundredths;
  if (thousandths >= 5) minor += 1;

  return fromMinor(sign === "-" ? -minor : minor);
}

export function parseOptionalMoney(input: string | number | null | undefined): Money | null {
  if (input === null || input === undefined || input === "") return null;
  return parseMoney(input);
}

/** Serialise for a Postgres `NUMERIC(12,2)` column. */
export function toDecimalString(value: Money): string {
  const negative = value < 0;
  const abs = Math.abs(value);
  const whole = Math.floor(abs / MINOR_UNITS_PER_MAJOR);
  const fraction = String(abs % MINOR_UNITS_PER_MAJOR).padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

export function add(a: Money, b: Money): Money {
  return fromMinor(a + b);
}

export function subtract(a: Money, b: Money): Money {
  return fromMinor(a - b);
}

export function negate(value: Money): Money {
  return fromMinor(-value);
}

export function sum(values: readonly Money[]): Money {
  let total = 0;
  for (const value of values) total += value;
  return fromMinor(total);
}

export function multiply(value: Money, factor: number): Money {
  if (!Number.isInteger(factor)) {
    throw new Error("Use `allocate` to split money by a non-integer factor.");
  }
  return fromMinor(value * factor);
}

export function isZero(value: Money): boolean {
  return value === 0;
}

export function isNegative(value: Money): boolean {
  return value < 0;
}

export function isPositive(value: Money): boolean {
  return value > 0;
}

export function max(a: Money, b: Money): Money {
  return a >= b ? a : b;
}

export function min(a: Money, b: Money): Money {
  return a <= b ? a : b;
}

/** Clamp to zero from below — used wherever a negative surplus is not "extra". */
export function atLeastZero(value: Money): Money {
  return value > 0 ? value : ZERO;
}

export function abs(value: Money): Money {
  return fromMinor(Math.abs(value));
}

/**
 * Split `total` into `parts` shares whose sum is exactly `total`.
 *
 * ₹9,000 over 31 days becomes twenty-two shares of ₹290.32 and nine of ₹290.33
 * rather than 31 rounded shares that lose ₹0.08. This is what stops money from
 * quietly disappearing in months whose length does not divide the budget.
 */
export function allocate(total: Money, parts: number): Money[] {
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new Error(`Cannot allocate money across ${parts} parts.`);
  }
  const shares: Money[] = [];
  for (let index = 0; index < parts; index += 1) {
    shares.push(fromMinor(shareBoundary(total, parts, index + 1) - shareBoundary(total, parts, index)));
  }
  return shares;
}

/** The share of `total` belonging to part `index` of an even `parts`-way split. */
export function allocationShare(total: Money, parts: number, index: number): Money {
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new Error(`Cannot allocate money across ${parts} parts.`);
  }
  if (!Number.isInteger(index) || index < 0 || index >= parts) {
    throw new Error(`Allocation index ${index} is outside 0..${parts - 1}.`);
  }
  return fromMinor(shareBoundary(total, parts, index + 1) - shareBoundary(total, parts, index));
}

/**
 * Cumulative share boundary. Truncating toward zero (rather than flooring)
 * keeps the split symmetric for negative totals.
 */
function shareBoundary(total: Money, parts: number, index: number): number {
  return Math.trunc((total * index) / parts);
}

/** Even per-part value, rounded half-up. Use for display, never for summing. */
export function divideForDisplay(total: Money, parts: number): Money {
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new Error(`Cannot divide money across ${parts} parts.`);
  }
  const exact = total / parts;
  return fromMinor(Math.sign(exact) * Math.round(Math.abs(exact)));
}

/** Percentage of `total` represented by `value`, as a 0-100 number. */
export function percentageOf(value: Money, total: Money): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}
