"use client";

import { Info, PiggyBank, Sparkles, TrendingDown } from "lucide-react";

import type { InsightHeadline as Headline } from "@/hooks/use-insights";
import { cn } from "@/lib/utils/cn";

/**
 * One sentence about how the month is going.
 *
 * Deliberately descriptive rather than judgemental: "you are currently using
 * future allowance" states a fact the user can act on, where "you overspent"
 * only tells them off. The tone changes the colour and the icon, never the
 * neutrality of the wording.
 */
const TONE_STYLES: Record<Headline["tone"], { className: string; icon: typeof Info }> = {
  empty: { className: "bg-surface-muted text-ink-muted", icon: Info },
  "low-data": { className: "bg-info-soft text-info", icon: Info },
  normal: { className: "bg-brand-soft text-brand-ink", icon: Sparkles },
  overspending: { className: "bg-warning-soft text-warning", icon: TrendingDown },
  "strong-saving": { className: "bg-positive-soft text-positive", icon: PiggyBank },
};

export function InsightHeadline({ headline }: { headline: Headline }) {
  const { className, icon: Icon } = TONE_STYLES[headline.tone];

  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-2xl px-4 py-3 text-sm font-medium",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{headline.message}</span>
    </p>
  );
}
