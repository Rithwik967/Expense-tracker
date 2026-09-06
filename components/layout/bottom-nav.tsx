"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils/cn";

/**
 * Bottom navigation, phones and tablets only.
 *
 * Fixed to the bottom because that is where a thumb reaches. Each target is at
 * least 44px tall before the safe-area inset is added, so the gesture bar on a
 * modern phone does not eat the tap. Wide screens get the inline nav in the top
 * bar instead — a bar pinned to the bottom of a laptop screen is a long way
 * from anything the user is looking at.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-safe shadow-nav backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex max-w-screen-sm items-stretch">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-brand" : "text-ink-subtle hover:text-ink-muted",
                )}
              >
                <Icon className="size-5" aria-hidden />
                <span className="truncate">{item.shortLabel}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
