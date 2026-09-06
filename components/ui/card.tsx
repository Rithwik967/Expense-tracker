import * as React from "react";

import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border-0 bg-surface-muted shadow-card",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-start justify-between gap-3 p-4 pb-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-sm font-semibold text-ink", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-ink-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-2 p-4 pt-0", className)} {...props} />;
}

/** A labelled figure. The building block of every summary card. */
export function Stat({
  label,
  value,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "positive" | "negative" | "muted";
  className?: string;
}) {
  const toneClass = {
    default: "text-ink",
    positive: "text-positive",
    negative: "text-negative",
    muted: "text-ink-muted",
  }[tone];

  return (
    <div className={cn("min-w-0", className)}>
      <dt className="truncate text-xs font-medium text-ink-muted">{label}</dt>
      <dd className={cn("tabular mt-0.5 truncate text-lg font-semibold", toneClass)}>{value}</dd>
      {hint ? <p className="mt-0.5 truncate text-xs text-ink-subtle">{hint}</p> : null}
    </div>
  );
}
