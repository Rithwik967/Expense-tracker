import { format, isSameDay, isSameYear } from "date-fns";

import type { DateKey, MonthKey } from "@/lib/finance/types";

import { parseDateKey } from "./dates";

/** Text formatting for dates, labels and percentages. */

export function formatMonthLabel(month: MonthKey, style: "long" | "short" = "long"): string {
  return format(parseDateKey(month), style === "long" ? "MMMM yyyy" : "MMM yyyy");
}

export function formatMonthNameOnly(month: MonthKey): string {
  return format(parseDateKey(month), "MMMM");
}

export function formatDayLabel(date: DateKey): string {
  return format(parseDateKey(date), "d MMM yyyy");
}

export function formatWeekdayShort(date: DateKey): string {
  return format(parseDateKey(date), "EEE");
}

export function formatDayOfMonth(date: DateKey): string {
  return format(parseDateKey(date), "d");
}

/** Axis-friendly, e.g. `1 Sep`. */
export function formatChartDate(date: DateKey): string {
  return format(parseDateKey(date), "d MMM");
}

/**
 * A heading a person would say out loud: "Today", "Yesterday", "Tomorrow",
 * "Sat, 12 Sep", or "12 Sep 2025" once the year differs.
 */
export function formatRelativeDayLabel(date: DateKey, today: DateKey): string {
  const target = parseDateKey(date);
  const reference = parseDateKey(today);

  if (isSameDay(target, reference)) return "Today";

  const dayDifference = Math.round(
    (target.getTime() - reference.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (dayDifference === -1) return "Yesterday";
  if (dayDifference === 1) return "Tomorrow";

  return isSameYear(target, reference)
    ? format(target, "EEE, d MMM")
    : format(target, "d MMM yyyy");
}

export function formatDateRange(from: DateKey, to: DateKey): string {
  const start = parseDateKey(from);
  const end = parseDateKey(to);

  if (isSameYear(start, end)) {
    return start.getMonth() === end.getMonth()
      ? `${format(start, "d")}–${format(end, "d MMM")}`
      : `${format(start, "d MMM")} – ${format(end, "d MMM")}`;
  }

  return `${format(start, "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`;
}

/** Value for an `<input type="date">`. */
export function toDateInputValue(date: DateKey): string {
  return date;
}

export function formatPercentage(value: number, fractionDigits = 0): string {
  return `${value.toFixed(fractionDigits)}%`;
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

/** "3 transactions", "1 transaction", "No transactions". */
export function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  if (count === 0) return `No ${plural}`;
  return `${count} ${pluralise(count, singular, plural)}`;
}
