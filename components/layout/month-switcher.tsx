"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { useAppData } from "@/components/providers/app-data-provider";
import { Button } from "@/components/ui/button";
import { addMonthsToKey } from "@/lib/utils/dates";
import { formatMonthLabel } from "@/lib/utils/formatting";

/**
 * Move between months.
 *
 * Future months are reachable on purpose: a transaction can be dated ahead, and
 * the month's allowance is known in advance, so October is a real thing to look
 * at in September. Changing the month re-reads one payload rather than
 * remounting the app, so the tab you are on stays where it is.
 */
export function MonthSwitcher({ compact = false }: { compact?: boolean }) {
  const { month, shiftMonth, goToCurrentMonth, isCurrentMonth } = useAppData();

  if (!month) {
    // Keeps the header from changing height once the date resolves.
    return <div className="h-11" aria-hidden />;
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => shiftMonth(-1)}
        aria-label={`Go to ${formatMonthLabel(addMonthsToKey(month, -1))}`}
      >
        <ChevronLeft aria-hidden />
      </Button>

      <p
        aria-live="polite"
        className="min-w-0 flex-1 text-center text-lg font-semibold leading-7 tracking-tight text-ink whitespace-nowrap"
      >
        {formatMonthLabel(month, compact ? "short" : "long")}
      </p>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => shiftMonth(1)}
        aria-label={`Go to ${formatMonthLabel(addMonthsToKey(month, 1))}`}
      >
        <ChevronRight aria-hidden />
      </Button>

      {!isCurrentMonth ? (
        <Button variant="ghost" size="sm" onClick={goToCurrentMonth} className="shrink-0 px-2">
          Today
        </Button>
      ) : null}
    </div>
  );
}
