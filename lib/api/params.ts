import "server-only";

import { DataError } from "@/lib/data/errors";
import type { DateKey, MonthKey } from "@/lib/finance/types";
import { currentMonthKey, isDateKey, isMonthKey, todayKey } from "@/lib/utils/dates";

/**
 * Query-parameter parsing.
 *
 * `today` is always supplied by the caller rather than read from the server
 * clock. A server in UTC and a phone in IST disagree about what "today" is for
 * five and a half hours every day, and during that window a server-derived date
 * would show the user the wrong day's balance. The server clock is only a
 * fallback for a request that omits the parameter.
 */

export function readDateParam(
  params: URLSearchParams,
  name: string,
  fallback?: DateKey,
): DateKey {
  const raw = params.get(name);
  if (raw === null) {
    if (fallback !== undefined) return fallback;
    throw DataError.validation(`The "${name}" parameter is required.`);
  }
  if (!isDateKey(raw)) {
    throw DataError.validation(`"${name}" must be a date in YYYY-MM-DD form.`);
  }
  return raw;
}

export function readOptionalDateParam(params: URLSearchParams, name: string): DateKey | undefined {
  const raw = params.get(name);
  if (raw === null || raw === "") return undefined;
  if (!isDateKey(raw)) {
    throw DataError.validation(`"${name}" must be a date in YYYY-MM-DD form.`);
  }
  return raw;
}

export function readMonthParam(value: string): MonthKey {
  if (!isMonthKey(value)) {
    throw DataError.validation(`"${value}" is not a month. Use YYYY-MM-01.`);
  }
  return value;
}

/** The caller's today, falling back to the server's date. */
export function readToday(params: URLSearchParams): DateKey {
  return readDateParam(params, "today", todayKey());
}

export function readMonthQuery(params: URLSearchParams): MonthKey {
  const raw = params.get("month");
  if (raw === null || raw === "") return currentMonthKey();
  return readMonthParam(raw);
}

export function readIntParam(
  params: URLSearchParams,
  name: string,
  options: { min?: number; max?: number; fallback?: number } = {},
): number | undefined {
  const raw = params.get(name);
  if (raw === null || raw === "") return options.fallback;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    throw DataError.validation(`"${name}" must be a whole number.`);
  }
  if (options.min !== undefined && parsed < options.min) {
    throw DataError.validation(`"${name}" must be at least ${options.min}.`);
  }
  if (options.max !== undefined && parsed > options.max) {
    throw DataError.validation(`"${name}" must be at most ${options.max}.`);
  }
  return parsed;
}

export function readListParam(params: URLSearchParams, name: string): string[] | undefined {
  const raw = params.get(name);
  if (raw === null || raw.trim() === "") return undefined;
  const values = raw.split(",").map((value) => value.trim()).filter(Boolean);
  return values.length > 0 ? values : undefined;
}
