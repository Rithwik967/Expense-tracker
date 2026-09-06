"use client";

import { format, subDays } from "date-fns";

import { cn } from "@/lib/utils/cn";
import type { DailyBalance, DateKey } from "@/lib/finance/types";
import { formatCompactCurrency } from "@/lib/utils/currency";
import { parseDateKey } from "@/lib/utils/dates";
import { formatDayLabel } from "@/lib/utils/formatting";

/**
 * The month as a grid of days.
 *
 * Every figure in a cell comes from the daily balances the engine produced for
 * this month. Monday is the first column. Status is the date colour: green
 * under budget, red over, yellow high spend — not a separate dot.
 */

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

  const leadingBlanks = (parseDateKey(first.date).getDay() + 6) % 7;
  const firstDate = parseDateKey(first.date);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface-muted p-4 shadow-card">
      <div className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-brand/5 blur-2xl" />

      <div className="mb-4 grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="label-caps text-ink-subtle">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-x-1 gap-y-2">
        {Array.from({ length: leadingBlanks }, (_, index) => {
          const date = subDays(firstDate, leadingBlanks - index);
          return (
            <div
              key={`blank-${index}`}
              className="flex min-h-11 flex-col items-center justify-center opacity-40"
              aria-hidden
            >
              <span className="text-lg font-semibold leading-none text-ink-muted">
                {format(date, "d")}
              </span>
            </div>
          );
        })}

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

function dayTone(day: DailyBalance, today: DateKey) {
  if (day.date > today) return "future" as const;
  if (day.endingBalance < 0) return "over" as const;
  if (day.totalSpent > day.dailyAllowance) return "high" as const;
  return "under" as const;
}

function dateToneClass(tone: ReturnType<typeof dayTone>) {
  if (tone === "over") return "text-negative";
  if (tone === "high") return "text-warning";
  if (tone === "under") return "text-positive";
  return "text-ink-muted";
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
  const tone = dayTone(day, today);

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
        "flex min-h-11 flex-col items-center justify-center rounded-xl px-0.5 py-1 transition-colors",
        isSelected && "bg-brand-soft ring-2 ring-brand",
        isToday && !isSelected && "ring-1 ring-brand/40",
        !isSelected && tone === "over" && "bg-negative-soft/40",
        !isSelected && tone === "high" && "bg-warning-soft/50",
        !isSelected && tone === "under" && "bg-positive-soft/20",
        tone === "future" && !isSelected && "opacity-55",
      )}
    >
      <span className={cn("text-lg font-semibold leading-none", dateToneClass(tone))}>
        {format(parseDateKey(day.date), "d")}
      </span>
      <span className={cn("mt-1 tabular text-[10px] font-semibold leading-none", dateToneClass(tone))}>
        {formatCompactCurrency(day.endingBalance, currency)}
      </span>
    </button>
  );
}

export function CalendarLegend() {
  return (
    <div className="mt-1 flex items-center justify-between rounded-xl bg-surface-low p-3 shadow-card">
      <LegendSwatch className="text-positive" label="Under budget" />
      <LegendSwatch className="text-negative" label="Over budget" />
      <LegendSwatch className="text-warning" label="High spend" />
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("text-sm font-bold", className)} aria-hidden>
        12
      </span>
      <span className="label-caps text-ink-subtle">{label}</span>
    </div>
  );
}
