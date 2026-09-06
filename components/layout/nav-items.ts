import {
  CalendarDays,
  ChartColumn,
  House,
  Receipt,
  Settings,
  type LucideIcon,
} from "lucide-react";

/**
 * The five destinations, shared by the bottom bar on a phone and the inline nav
 * on a wide screen so the two can never fall out of step.
 */
export interface NavItem {
  readonly href: string;
  readonly label: string;
  /** Shorter form for the bottom bar, where 320px has to fit five labels. */
  readonly shortLabel: string;
  readonly icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/home", label: "Home", shortLabel: "Home", icon: House },
  { href: "/calendar", label: "Calendar", shortLabel: "Calendar", icon: CalendarDays },
  { href: "/insights", label: "Insights", shortLabel: "Insights", icon: ChartColumn },
  { href: "/transactions", label: "Transactions", shortLabel: "History", icon: Receipt },
  { href: "/settings", label: "Settings", shortLabel: "Settings", icon: Settings },
];
