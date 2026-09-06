"use client";

import * as React from "react";

import { MonthSwitcher } from "@/components/layout/month-switcher";

/**
 * A screen's title row, with the month control for the screens whose contents
 * depend on which month is selected.
 */
export function PageHeader({
  title,
  description,
  withMonthSwitcher = false,
  action,
}: {
  title: string;
  description?: string;
  withMonthSwitcher?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
          {description ? <p className="mt-0.5 text-sm text-ink-muted">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {withMonthSwitcher ? (
        <div className="rounded-control border border-border bg-surface px-1">
          <MonthSwitcher />
        </div>
      ) : null}
    </div>
  );
}
