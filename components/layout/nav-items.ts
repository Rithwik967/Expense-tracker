import {
  CalendarDays,
  ChartColumn,
  House,
  Receipt,
  Settings,
  type LucideIcon,
} from "lucide-react";

/**
 * Destinations shared by the phone bar and the wide-screen header so the two
 * can never fall out of step. Transactions stay reachable from Home / Calendar
 * ("View all") and from the desktop header — the Stitch shell puts Add in the
 * middle of the phone bar instead of a fifth tab.
 */
export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/home", label: "Home", shortLabel: "Home", icon: House },
  { href: "/calendar", label: "Calendar", shortLabel: "Calendar", icon: CalendarDays },
  { href: "/insights", label: "Insights", shortLabel: "Insights", icon: ChartColumn },
  { href: "/settings", label: "Settings", shortLabel: "Settings", icon: Settings },
];

export const DESKTOP_NAV_ITEMS: readonly NavItem[] = [
  ...NAV_ITEMS.slice(0, 3),
  { href: "/transactions", label: "Transactions", shortLabel: "History", icon: Receipt },
  NAV_ITEMS[3],
];
