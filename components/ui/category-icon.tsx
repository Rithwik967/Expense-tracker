"use client";

import {
  Bus,
  CircleEllipsis,
  Clapperboard,
  Drumstick,
  Dumbbell,
  Gift,
  HeartPulse,
  House,
  Plug,
  Sandwich,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Utensils,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";

/**
 * The picture on a category.
 *
 * A registry rather than a lookup across the whole icon set: importing all of
 * Lucide to resolve a name at runtime would pull thousands of components into
 * the bundle to render ten. Anything unrecognised — including a category the
 * user named themselves — falls back to a neutral mark instead of vanishing.
 */
const ICONS: Record<string, LucideIcon> = {
  drumstick: Drumstick,
  "shopping-cart": ShoppingCart,
  sandwich: Sandwich,
  utensils: Utensils,
  clapperboard: Clapperboard,
  "shopping-bag": ShoppingBag,
  "bus-front": Bus,
  dumbbell: Dumbbell,
  "user-round": UserRound,
  "circle-ellipsis": CircleEllipsis,
  house: House,
  "heart-pulse": HeartPulse,
  gift: Gift,
  smartphone: Smartphone,
  plug: Plug,
};

/** Names offered when creating or renaming a category. */
export const CATEGORY_ICON_NAMES = Object.keys(ICONS);

export function CategoryIcon({
  name,
  className,
}: {
  name: string | null;
  className?: string;
}) {
  const Icon = (name && ICONS[name]) || CircleEllipsis;
  return <Icon className={cn("size-4", className)} aria-hidden />;
}
