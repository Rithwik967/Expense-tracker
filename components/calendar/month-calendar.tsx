"use client";

import { format } from "date-fns";

import { cn } from "@/lib/utils/cn";
import type { DailyBalance, DateKey } from "@/lib/finance/types";
import { formatCompactCurrency } from "@/lib/utils/currency";
import { parseDateKey } from "@/lib/utils/dates";
import { formatDayLabel } from "@/lib/utils/formatting";

/**
 * The month as a grid of days.
 *
 * Every figure in a cell comes from the daily balances the engine produced for
 * this month — the component places them, it does not compute them. Two numbers
 * appear per day: what was spent, and the balance the day closed at, because
 * "I spent ₹400" and "I am ₹200 down" are different facts and the grid is where
 * the relationship between them is visible.
 *
 * Days after today are shown faintly. They have an allowance and therefore a
 * balance, but nothing has happened on them yet.
 */

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MonthCalendar({
  days,
  today,
  currency,
  selected,
  onSelect,
}: {
  days: readonly DailyBalance[];
  today: DateKey;
  currency: string;
  selected: DateKey | null;
  onSelect: (date: DateKey) => void;
}) {
  const first = days[0];
  if (!first) return null;

  // Blank cells before the first of the month, so the columns line up with the
  // weekday headings.
  const leadingBlanks = parseDateKey(first.date).getDay();

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 px-0.5 pb-1.5">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-[10px] font-semibold text-ink-subtle">
            <span aria-hidden>{label.slice(0, 1)}</span>
            <span className="sr-only">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <div key={`blank-${index}`} aria-hidden />
        ))}

        {days.map((day) => (
          <DayCell
            key={day.date}
            day={day}
            today={today}
            currency={currency}
            isSelected={day.date === selected}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function DayCell({
  day,
  today,
  currency,
  isSelected,
  onSelect,
}: {
  day: DailyBalance;
  today: DateKey;
  currency: string;
  isSelected: boolean;
  onSelect: (date: DateKey) => void;
}) {
  const isToday = day.date === today;
  const isFuture = day.date > today;
  const negative = day.endingBalance < 0;

  const spokenLabel = [
    formatDayLabel(day.date),
    day.totalSpent > 0
      ? `spent ${formatCompactCurrency(day.totalSpent, currency)}`
      : "nothing spent",
    `closing balance ${formatCompactCurrency(day.endingBalance, currency)}`,
  ].join(", ");

  return (
    <button
      type="button"
      onClick={() => onSelect(day.date)}
      aria-label={spokenLabel}
      aria-current={isToday ? "date" : undefined}
      aria-pressed={isSelected}
      className={cn(
        "flex min-h-[58px] flex-col items-center justify-center gap-0.5 rounded-lg border px-0.5 py-1.5 transition-colors",
        isSelected
          ? "border-brand bg-brand-soft"
          : isToday
            ? "border-brand/50 bg-surface"
            : "border-border bg-surface hover:bg-surface-muted",
        isFuture && !isSelected && "opacity-55",
      )}
    >
      <span
        className={cn(
          "text-xs font-semibold leading-none",
          isToday ? "text-brand-ink" : "text-ink",
        )}
      >
        {format(parseDateKey(day.date), "d")}
      </span>

      <span
        className={cn(
          "tabular text-[10px] font-medium leading-none",
          day.totalSpent > 0 ? "text-ink-muted" : "text-transparent",
        )}
      >
        {day.totalSpent > 0 ? formatCompactCurrency(day.totalSpent, currency) : "—"}
      </span>

      <span
        className={cn(
          "tabular text-[10px] font-semibold leading-none",
          negative ? "text-negative" : "text-positive",
        )}
      >
        {formatCompactCurrency(day.endingBalance, currency)}
      </span>
    </button>
  );
}
