"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/states";

/**
 * Placeholder for the dashboard while the month is loading.
 *
 * Mirrors the real layout closely enough that nothing jumps when the data
 * arrives, and shows no figures at all — a placeholder ₹0 would read as a fact.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading this month&apos;s figures…</span>

      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="grid grid-cols-3 gap-3 border-t border-border pt-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-2 w-full" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

/** Rows-shaped placeholder for any of the transaction lists. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card className="divide-y divide-border" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-14 shrink-0" />
        </div>
      ))}
    </Card>
  );
}
