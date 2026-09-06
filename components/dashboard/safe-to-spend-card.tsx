"use client";

import { CalendarClock } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Amount } from "@/components/ui/money";
import type { SafeToSpend } from "@/lib/finance/types";
import { countLabel, formatDayLabel } from "@/lib/utils/formatting";

/**
 * Available balance, less what is already promised.
 *
 * Planned expenses are reservations. They are subtracted here and nowhere else:
 * the actual balance stays untouched until a plan is marked as spent and
 * becomes a real transaction, which is what stops the same ₹500 from being
 * counted twice.
 */
export function SafeToSpendCard({
  safeToSpend,
  currency,
}: {
  safeToSpend: SafeToSpend;
  currency: string;
}) {
  const negative = safeToSpend.safeToSpend < 0;

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-muted">Safe to spend</p>
            <p
              className={`tabular mt-0.5 text-2xl font-semibold ${
                negative ? "text-negative" : "text-ink"
              }`}
            >
              <Amount value={safeToSpend.safeToSpend} currency={currency} />
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/planned">
              <CalendarClock aria-hidden />
              Plans
            </Link>
          </Button>
        </div>

        <dl className="space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-muted">Available now</dt>
            <dd className="tabular font-medium text-ink">
              <Amount value={safeToSpend.availableBalance} currency={currency} />
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-muted">
              Reserved for {countLabel(safeToSpend.plannedExpenseCount, "plan")}
            </dt>
            <dd className="tabular font-medium text-ink">
              −<Amount value={safeToSpend.reservedForPlanned} currency={currency} />
            </dd>
          </div>
        </dl>

        <p className="text-xs text-ink-subtle">
          Covers plans through {formatDayLabel(safeToSpend.horizonEnd)}. Reservations do not change
          your balance.
        </p>
      </CardContent>
    </Card>
  );
}
