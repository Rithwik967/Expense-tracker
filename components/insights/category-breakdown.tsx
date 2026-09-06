"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { TooltipBox } from "@/components/insights/chart-frame";
import { Amount } from "@/components/ui/money";
import type { CategorySlice } from "@/hooks/use-insights";
import { fromMinor, toMajorNumber } from "@/lib/finance/money";
import { formatCurrency } from "@/lib/utils/currency";
import { formatPercentage } from "@/lib/utils/formatting";

/**
 * Where the month's spending went, largest share first.
 *
 * The ring is a summary; the list is the answer. Each row states the amount and
 * its share, so the information does not depend on distinguishing ten colours —
 * and the bar under each row gives the same comparison at a glance.
 */
export function CategoryBreakdown({
  categories,
  currency,
}: {
  categories: readonly CategorySlice[];
  currency: string;
}) {
  const chartData = categories.map((slice) => ({
    name: slice.name,
    value: toMajorNumber(slice.amount),
    color: slice.color,
    percentage: slice.percentage,
  }));

  return (
    <div className="space-y-4 sm:flex sm:items-center sm:gap-6 sm:space-y-0">
      <div className="mx-auto hidden h-40 w-40 shrink-0 sm:block">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={44}
              outerRadius={72}
              paddingAngle={1.5}
              strokeWidth={0}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                const entry = active
                  ? (payload?.[0]?.payload as (typeof chartData)[number] | undefined)
                  : undefined;
                if (!entry) return null;
                return (
                  <TooltipBox
                    title={entry.name}
                    rows={[
                      {
                        label: formatPercentage(entry.percentage),
                        value: formatCurrency(fromMinor(Math.round(entry.value * 100)), currency),
                        color: entry.color,
                      },
                    ]}
                  />
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="min-w-0 flex-1 space-y-3 sm:pt-0">
        {categories.map((slice) => (
          <li key={slice.categoryId ?? "uncategorised"}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="truncate text-sm font-medium text-ink">{slice.name}</span>
              </span>
              <span className="tabular shrink-0 text-sm font-semibold text-ink">
                <Amount value={slice.amount} currency={currency} />
              </span>
            </div>

            <div className="mt-1 flex items-center gap-2">
              <div
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted"
                aria-hidden
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(2, Math.min(100, slice.percentage))}%`,
                    backgroundColor: slice.color,
                  }}
                />
              </div>
              <span className="tabular w-14 shrink-0 text-right text-xs text-ink-muted">
                {formatPercentage(slice.percentage)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
