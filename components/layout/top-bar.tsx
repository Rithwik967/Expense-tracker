"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound } from "lucide-react";

import { AppLogo } from "@/components/brand/app-logo";
import { DESKTOP_NAV_ITEMS } from "@/components/layout/nav-items";
import { MonthSwitcher } from "@/components/layout/month-switcher";
import { AvatarButton } from "@/components/profile/avatar-button";
import { useProfile } from "@/components/providers/profile-provider";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";

/**
 * Sticky header: mark on the left, month in the middle, identity on the right.
 * Wide screens also get the full section list inline.
 */
export function TopBar() {
  const pathname = usePathname();
  const { profile } = useProfile();

  return (
    <header className="sticky top-0 z-30 bg-surface/80 pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-screen-sm items-center justify-between gap-2 px-5 lg:max-w-5xl">
        <Link href="/home" className="flex min-w-0 items-center gap-2">
          <AppLogo />
          <span className="sr-only">{APP_NAME}</span>
        </Link>

        <div className="min-w-0 flex-1 max-w-[220px] sm:max-w-xs">
          <MonthSwitcher compact />
        </div>

        <nav aria-label="Sections" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {DESKTOP_NAV_ITEMS.map((item) => {
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

        <Link href="/profile" aria-label="User profile" className="shrink-0">
          {profile ? (
            <AvatarButton name={profile.displayName} src={profile.avatarUrl} size="sm" />
          ) : (
            <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-surface-high text-ink-muted">
              <UserRound className="size-4" />
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
