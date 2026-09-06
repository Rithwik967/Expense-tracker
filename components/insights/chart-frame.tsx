"use client";

import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency } from "@/lib/utils/currency";
import { fromMinor } from "@/lib/finance/money";

/**
 * Shared chrome and conventions for the charts.
 *
 * Axis ticks are compact (`₹1.2k`) and thinned out, because a 31-day axis at
 * 320px cannot show 31 labels. Tooltips are the only place a full amount
 * appears, and they are triggered by touch as well as hover so the detail is
 * reachable without a mouse.
 */

export function ChartCard({
  title,
  caption,
  action,
  children,
}: {
  title: string;
  caption?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {caption ? <p className="mt-0.5 text-xs text-ink-muted">{caption}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </CardHeader>
      <CardContent className="pt-3">{children}</CardContent>
    </Card>
  );
}

/** Compact axis tick, e.g. `₹1.2k`. Takes major units, as Recharts supplies. */
export function formatAxisAmount(value: number, currency: string): string {
  return formatCompactCurrency(fromMinor(Math.round(value * 100)), currency);
}

/**
 * Show roughly six date labels regardless of month length, so the axis stays
 * legible on a narrow screen.
 */
export function dateTickInterval(pointCount: number): number {
  return Math.max(0, Math.ceil(pointCount / 6) - 1);
}

export const AXIS_STYLE = {
  fontSize: 10,
  fill: "var(--color-ink-subtle)",
} as const;

export const GRID_STROKE = "var(--color-border)";

/** Tooltip body, styled to match the cards rather than Recharts' default. */
export function TooltipBox({
  title,
  rows,
}: {
  title: string;
  rows: readonly { label: string; value: string; color?: string }[];
}) {
  return (
    <div className="rounded-control border border-border bg-surface px-3 py-2 shadow-raised">
      <p className="text-xs font-semibold text-ink">{title}</p>
      <ul className="mt-1 space-y-0.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2 text-xs text-ink-muted">
            {row.color ? (
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: row.color }}
              />
            ) : null}
            <span>{row.label}</span>
            <span className="tabular ml-auto font-medium text-ink">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
