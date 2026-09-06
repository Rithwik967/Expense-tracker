"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
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
import type { BalancePoint } from "@/hooks/use-insights";
import { fromMinor } from "@/lib/finance/money";
import { formatCurrency } from "@/lib/utils/currency";

/**
 * Available balance through the month.
 *
 * The zero line is drawn explicitly and the fill changes colour where the
 * series crosses it, because "below zero" is the single most important thing
 * this chart can tell the user: it means the coming days' allowance is already
 * committed to catching up.
 */
export function BalanceChart({
  data,
  currency,
}: {
  data: readonly BalancePoint[];
  currency: string;
}) {
  const interval = dateTickInterval(data.length);
  const values = data.map((point) => point.balance);
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);

  // Where zero falls in the vertical span, so the gradient can switch colour
  // exactly at the axis rather than at an approximation of it.
  const zeroOffset = max === min ? 1 : max / (max - min);

  return (
    <div className="h-56 w-full sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={[...data]} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset={0} stopColor="var(--color-positive)" stopOpacity={0.25} />
              <stop offset={zeroOffset} stopColor="var(--color-positive)" stopOpacity={0.02} />
              <stop offset={zeroOffset} stopColor="var(--color-negative)" stopOpacity={0.08} />
              <stop offset={1} stopColor="var(--color-negative)" stopOpacity={0.28} />
            </linearGradient>
            <linearGradient id="balance-stroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset={zeroOffset} stopColor="var(--color-brand)" />
              <stop offset={zeroOffset} stopColor="var(--color-negative)" />
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
          <Tooltip
            content={({ active, payload }) => {
              const point = active ? (payload?.[0]?.payload as BalancePoint | undefined) : undefined;
              if (!point) return null;
              return (
                <TooltipBox
                  title={point.label}
                  rows={[
                    {
                      label: point.isFuture ? "Projected balance" : "Balance",
                      value: formatCurrency(fromMinor(Math.round(point.balance * 100)), currency),
                      color:
                        point.balance < 0 ? "var(--color-negative)" : "var(--color-brand)",
                    },
                  ]}
                />
              );
            }}
          />
          <ReferenceLine y={0} stroke="var(--color-border-strong)" />
          <Area
            type="monotone"
            dataKey="balance"
            name="Balance"
            stroke="url(#balance-stroke)"
            strokeWidth={2}
            fill="url(#balance-fill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
