"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/components/layout/nav-items";
import { AddNavButton } from "@/components/transactions/add-transaction-fab";
import { cn } from "@/lib/utils/cn";

/**
 * Bottom navigation, phones and tablets only.
 *
 * Home and Calendar sit to the left of a raised Add control; Insights and
 * Settings sit to the right — the Stitch shell. Each target stays at least
 * 44px tall before the safe-area inset is added.
 */
export function BottomNav() {
  const pathname = usePathname();
  const left = NAV_ITEMS.slice(0, 2);
  const right = NAV_ITEMS.slice(2);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 bg-surface/90 pb-safe shadow-nav backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto flex h-20 max-w-screen-sm items-center justify-between px-5">
        {left.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
        <AddNavButton />
        {right.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}

function NavLink({
  item,
  pathname,
}: {
  item: (typeof NAV_ITEMS)[number];
  pathname: string;
}) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-14 flex-col items-center gap-1 py-1 text-[11px] transition-colors",
        active ? "font-bold text-brand" : "text-ink-subtle hover:text-ink-muted",
      )}
    >
      <Icon className="size-6" aria-hidden />
      <span className="label-caps truncate">{item.shortLabel}</span>
    </Link>
  );
}
