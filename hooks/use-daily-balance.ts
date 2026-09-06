"use client";

import { useAppData } from "@/components/providers/app-data-provider";
import { useReloadOnChange, useResource, type Resource } from "@/hooks/use-resource";
import { api } from "@/lib/api/client";
import type { DateKey } from "@/lib/finance/types";
import type { DayView } from "@/types/app";

/**
 * One day's full breakdown, straight from `getDailyBalance` on the server.
 *
 * The calendar already holds every day of the visible month, so this is used
 * for a day outside it — and, on any day, to pick up an edit made from the day
 * sheet itself without waiting for the whole month to come back.
 */
export function useDailyBalance(date: DateKey | null): Resource<DayView> {
  const { revision } = useAppData();

  const resource = useResource<DayView>(date ? `day:${date}` : null, () =>
    api.day(date as DateKey),
  );

  useReloadOnChange(resource.reload, revision);

  return resource;
}

/**
 * A day from the month already loaded, when that month is on screen.
 *
 * Avoids a request for the common case: tapping a day in the calendar the user
 * is looking at.
 */
export function useDayFromMonth(date: DateKey | null) {
  const { monthView } = useAppData();
  if (!date || !monthView.data) return null;
  return monthView.data.days.find((day) => day.date === date) ?? null;
}
