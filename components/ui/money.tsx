import * as React from "react";

import type { Money } from "@/lib/finance/money";
import { formatCurrency, type CurrencyFormatOptions } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

/**
 * Render an amount.
 *
 * Colour is applied only where the sign carries meaning — a balance that has
 * gone negative, a surplus. A plain expense figure stays neutral so the screen
 * does not read as though everything is an alarm.
 */
export function Amount({
  value,
  currency = "INR",
  colorBySign = false,
  className,
  ...options
}: {
  value: Money;
  currency?: string;
  colorBySign?: boolean;
  className?: string;
} & CurrencyFormatOptions) {
  const tone = !colorBySign ? "" : value < 0 ? "text-negative" : value > 0 ? "text-positive" : "";

  return (
    <span className={cn("tabular", tone, className)}>
      {formatCurrency(value, currency, options)}
    </span>
  );
}
