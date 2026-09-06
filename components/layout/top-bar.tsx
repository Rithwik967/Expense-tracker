"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/components/layout/nav-items";
import { useAppData } from "@/components/providers/app-data-provider";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import { formatDayLabel } from "@/lib/utils/formatting";

/**
 * Sticky header: identity on the left, the viewer's date on the right, and the
 * full navigation inline once there is room for it.
 */
export function TopBar() {
  const pathname = usePathname();
  const { today } = useAppData();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/90 pt-safe backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-screen-sm items-center gap-3 px-4 lg:max-w-5xl">
        <Link href="/home" className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-base font-bold text-white"
          >
            ₹
          </span>
          <span className="truncate text-sm font-semibold text-ink">{APP_NAME}</span>
        </Link>

        <nav aria-label="Sections" className="ml-4 hidden flex-1 lg:block">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-control px-3 text-sm font-medium transition-colors",
                      active
                        ? "bg-brand-soft text-brand-ink"
                        : "text-ink-muted hover:bg-surface-muted hover:text-ink",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <p className="ml-auto shrink-0 text-xs font-medium text-ink-subtle">
          {today ? formatDayLabel(today) : null}
        </p>
      </div>
    </header>
  );
}
