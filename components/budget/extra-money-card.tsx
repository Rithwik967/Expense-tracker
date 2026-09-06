"use client";

import { PiggyBank } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Amount } from "@/components/ui/money";
import type { Money } from "@/lib/finance/money";
import type { CarryForwardRecord, MonthKey } from "@/lib/finance/types";
import { addMonthsToKey } from "@/lib/utils/dates";
import { formatMonthLabel } from "@/lib/utils/formatting";

/**
 * Extra Money and the Fun Fund.
 *
 * Both are the same number wearing two hats: the positive balance carried in
 * from earlier months. It is *already inside* the available balance, so it is
 * presented as a component of that figure and never added to it. Spending it is
 * an ordinary expense — there is no second wallet to draw from, which is the
 * only way to keep it from being counted twice.
 */
export function ExtraMoneyCard({
  month,
  funFund,
  carryForward,
  history,
  currency,
}: {
  month: MonthKey;
  funFund: Money;
  carryForward: Money;
  history: readonly CarryForwardRecord[];
  currency: string;
}) {
  const [showHistory, setShowHistory] = React.useState(false);
  const previousMonth = addMonthsToKey(month, -1);
  const inDebt = carryForward < 0;

  // Newest first, and only months that actually ended with something to carry.
  const relevantHistory = [...history].reverse().slice(0, 6);

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink"
          >
            <PiggyBank className="size-4" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-ink-muted">
              {inDebt ? "Carried from last month" : "Fun Fund"}
            </p>
            <p
              className={`tabular mt-0.5 text-2xl font-semibold ${
                inDebt ? "text-negative" : "text-ink"
              }`}
            >
              <Amount value={inDebt ? carryForward : funFund} currency={currency} />
            </p>
            <p className="mt-1 text-xs text-ink-subtle">
              {inDebt ? (
                <>
                  {formatMonthLabel(previousMonth)} ended below zero, so this month&apos;s allowance
                  is recovering it day by day.
                </>
              ) : funFund > 0 ? (
                <>
                  <Amount value={funFund} currency={currency} /> carried from{" "}
                  {formatMonthLabel(previousMonth)}. Unused spending capacity, not extra income —
                  and already part of your available balance.
                </>
              ) : (
                <>
                  Nothing carried into {formatMonthLabel(month)} yet. Whatever is left at month end
                  becomes next month&apos;s Fun Fund.
                </>
              )}
            </p>
          </div>
        </div>

        {relevantHistory.length > 0 ? (
          <div className="border-t border-border pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory((current) => !current)}
              aria-expanded={showHistory}
              className="px-0"
            >
              {showHistory ? "Hide" : "Show"} earlier months
            </Button>

            {showHistory ? (
              <ul className="mt-2 space-y-1.5">
                {relevantHistory.map((record) => (
                  <li
                    key={record.month}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="text-ink-muted">{formatMonthLabel(record.month, "short")}</span>
                    <span
                      className={`tabular font-medium ${
                        record.closingBalance < 0 ? "text-negative" : "text-ink"
                      }`}
                    >
                      <Amount value={record.closingBalance} currency={currency} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
