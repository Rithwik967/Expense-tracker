import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  getDaysInMonth,
  isValid,
  parse,
  startOfMonth,
} from "date-fns";

import type { DateKey, MonthKey } from "@/lib/finance/types";

/**
 * Calendar dates in this app are plain `YYYY-MM-DD` strings — they name a day
 * on a wall calendar, not an instant in time. Every `Date` produced here is
 * therefore anchored to *local* midnight so that `date-fns` (which formats in
 * local time) round-trips a key back to the same key.
 *
 * The one rule that keeps this consistent: never call `toISOString()` on one of
 * these dates, because that reinterprets local midnight as a UTC instant and
 * can shift the day by one.
 */

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_KEY_FORMAT = "yyyy-MM-dd";

export function isDateKey(value: string): value is DateKey {
  if (!DATE_KEY_PATTERN.test(value)) return false;
  const parsed = parse(value, DATE_KEY_FORMAT, new Date());
  // `parse` is lenient about e.g. 2026-02-31, so confirm it round-trips.
  return isValid(parsed) && format(parsed, DATE_KEY_FORMAT) === value;
}

export function assertDateKey(value: string): DateKey {
  if (!isDateKey(value)) {
    throw new Error(`Invalid date "${value}". Expected YYYY-MM-DD.`);
  }
  return value;
}

export function toDateKey(date: Date): DateKey {
  return format(date, DATE_KEY_FORMAT) as DateKey;
}

export function parseDateKey(key: DateKey): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** The first day of the month containing `key`, e.g. `2026-09-14` -> `2026-09-01`. */
export function toMonthKey(key: DateKey): MonthKey {
  return `${key.slice(0, 7)}-01` as MonthKey;
}

export function isMonthKey(value: string): value is MonthKey {
  return isDateKey(value) && value.endsWith("-01");
}

export function monthKeyOf(date: Date): MonthKey {
  return toDateKey(startOfMonth(date)) as MonthKey;
}

export function daysInMonth(month: MonthKey): number {
  return getDaysInMonth(parseDateKey(month));
}

export function lastDayOfMonth(month: MonthKey): DateKey {
  return toDateKey(endOfMonth(parseDateKey(month)));
}

export function addMonthsToKey(month: MonthKey, amount: number): MonthKey {
  return toDateKey(startOfMonth(addMonths(parseDateKey(month), amount))) as MonthKey;
}

export function addDaysToKey(key: DateKey, amount: number): DateKey {
  return toDateKey(addDays(parseDateKey(key), amount));
}

export function eachDayOfMonth(month: MonthKey): DateKey[] {
  const total = daysInMonth(month);
  const days: DateKey[] = [];
  for (let i = 0; i < total; i += 1) {
    days.push(addDaysToKey(month, i));
  }
  return days;
}

/** Zero-based index of `key` within its month. `2026-09-01` -> 0. */
export function dayIndexInMonth(key: DateKey): number {
  return Number(key.slice(8, 10)) - 1;
}

export function daysBetween(from: DateKey, to: DateKey): number {
  return differenceInCalendarDays(parseDateKey(to), parseDateKey(from));
}

export function compareDateKeys(a: DateKey, b: DateKey): number {
  // Zero-padded ISO dates sort correctly as plain strings.
  return a < b ? -1 : a > b ? 1 : 0;
}

export function minDateKey(a: DateKey, b: DateKey): DateKey {
  return a <= b ? a : b;
}

export function maxDateKey(a: DateKey, b: DateKey): DateKey {
  return a >= b ? a : b;
}

export function isWithinMonth(key: DateKey, month: MonthKey): boolean {
  return key.slice(0, 7) === month.slice(0, 7);
}

/** Today according to the *viewer's* clock. Call this on the client. */
export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now);
}

export function currentMonthKey(now: Date = new Date()): MonthKey {
  return monthKeyOf(now);
}
