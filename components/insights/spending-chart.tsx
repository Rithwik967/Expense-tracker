"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  AXIS_STYLE,
  GRID_STROKE,
  TooltipBox,
  dateTickInterval,
  formatAxisAmount,
} from "@/components/insights/chart-frame";
import { Segmented } from "@/components/ui/segmented";
import type { SpendingPoint } from "@/hooks/use-insights";
import { fromMinor } from "@/lib/finance/money";
import { formatCurrency } from "@/lib/utils/currency";

/**
 * Spending across the month, one point per day.
 *
 * Daily mode plots each day's expenses against the daily allowance, so a day
 * that overshot is obvious. Cumulative mode plots spending against the
 * allowance accrued so far — the two lines crossing is the moment the month
 * went from saving to borrowing.
 *
 * Zero-spending days are kept in the series on purpose: dropping them would
 * compress the axis and make a quiet week look like a busy one.
 */

export type SpendingChartMode = "daily" | "cumulative";

const MODE_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "cumulative", label: "Cumulative" },
] as const;

export function SpendingChartToggle({
  mode,
  onChange,
}: {
  mode: SpendingChartMode;
  onChange: (mode: SpendingChartMode) => void;
}) {
  return (
    <Segmented
      label="Chart mode"
      size="sm"
      options={MODE_OPTIONS}
      value={mode}
      onChange={onChange}
      className="w-auto"
    />
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: readonly { payload?: SpendingPoint }[];
}

export function SpendingChart({
  data,
  mode,
  currency,
  dailyAllowance,
}: {
  data: readonly SpendingPoint[];
  mode: SpendingChartMode;
  currency: string;
  /** Major-unit allowance per day, drawn as the reference line in daily mode. */
  dailyAllowance: number;
}) {
  const interval = dateTickInterval(data.length);
  const rupees = (major: number) => formatCurrency(fromMinor(Math.round(major * 100)), currency);

  const renderTooltip = ({ active, payload }: TooltipProps) => {
    const point = active ? payload?.[0]?.payload : undefined;
    if (!point) return null;

    return (
      <TooltipBox
        title={point.label}
        rows={
          mode === "daily"
            ? [
                { label: "Spent", value: rupees(point.spent), color: "var(--color-brand)" },
                { label: "Allowance", value: rupees(point.allowance) },
              ]
            : [
                { label: "Spent so far", value: rupees(point.cumulative), color: "var(--color-brand)" },
                { label: "Allowance so far", value: rupees(point.allowanceCumulative) },
              ]
        }
      />
    );
  };

  return (
    <div className="h-56 w-full sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        {mode === "daily" ? (
          <BarChart data={[...data]} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={AXIS_STYLE}
              interval={interval}
              tickLine={false}
              axisLine={{ stroke: GRID_STROKE }}
            />
            <YAxis
              tick={AXIS_STYLE}
              tickFormatter={(value: number) => formatAxisAmount(value, currency)}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip content={renderTooltip} cursor={{ fill: "var(--color-surface-muted)" }} />
            <ReferenceLine
              y={dailyAllowance}
              stroke="var(--color-ink-subtle)"
              strokeDasharray="4 4"
            />
            <Bar
              dataKey="spent"
              name="Spent"
              fill="var(--color-brand)"
              radius={[3, 3, 0, 0]}
              maxBarSize={22}
            />
          </BarChart>
        ) : (
          <AreaChart data={[...data]} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <defs>
              <linearGradient id="cumulative-spend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={AXIS_STYLE}
              interval={interval}
              tickLine={false}
              axisLine={{ stroke: GRID_STROKE }}
            />
            <YAxis
              tick={AXIS_STYLE}
              tickFormatter={(value: number) => formatAxisAmount(value, currency)}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip content={renderTooltip} />
            <Area
              type="monotone"
              dataKey="cumulative"
              name="Spent so far"
              stroke="var(--color-brand)"
              strokeWidth={2}
              fill="url(#cumulative-spend)"
            />
            <Line
              type="monotone"
              dataKey="allowanceCumulative"
              name="Allowance so far"
              stroke="var(--color-ink-subtle)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              dot={false}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
