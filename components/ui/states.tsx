import { AlertTriangle, type LucideIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * Loading, empty and error states.
 *
 * Empty and error are separate components on purpose. "You have not spent
 * anything" and "we could not find out what you spent" look similar on screen
 * but mean opposite things, and rendering ₹0 for a failed request would be a
 * lie about the user's money. An error always offers a way to try again.
 */

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-surface-muted", className)}
      {...props}
    />
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      {Icon ? (
        <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-surface-muted text-ink-subtle">
          <Icon className="size-5" aria-hidden />
        </div>
      ) : null}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description ? (
        <p className="mt-1 max-w-xs text-sm text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "We could not load this",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center rounded-card border border-negative/30 bg-negative-soft px-6 py-8 text-center",
        className,
      )}
    >
      <AlertTriangle className="size-5 text-negative" aria-hidden />
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-ink-muted">
        {message ?? "Something went wrong while fetching your data."}
      </p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/** Inline banner for a non-blocking problem, such as a failed save. */
export function InlineError({ message, className }: { message: string; className?: string }) {
  return (
    <p
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-control bg-negative-soft px-3 py-2 text-sm text-negative",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </p>
  );
}
