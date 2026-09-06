"use client";

import { useAppData } from "@/components/providers/app-data-provider";
import { CategoryIcon } from "@/components/ui/category-icon";
import { cn } from "@/lib/utils/cn";

const TINTS = [
  { bg: "bg-orange-100 dark:bg-orange-950", text: "text-orange-700 dark:text-orange-300" },
  { bg: "bg-emerald-100 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-300" },
  { bg: "bg-blue-100 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300" },
  { bg: "bg-purple-100 dark:bg-purple-950", text: "text-purple-700 dark:text-purple-300" },
  { bg: "bg-pink-100 dark:bg-pink-950", text: "text-pink-700 dark:text-pink-300" },
  { bg: "bg-red-100 dark:bg-red-950", text: "text-red-700 dark:text-red-300" },
  { bg: "bg-indigo-100 dark:bg-indigo-950", text: "text-indigo-700 dark:text-indigo-300" },
  { bg: "bg-surface-high", text: "text-ink-muted" },
] as const;

/**
 * Category picker as a 4-column icon grid, matching the Add Expense screen.
 */
export function CategoryGrid({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { activeCategories, categories } = useAppData();

  const selectedInactive =
    value && !activeCategories.some((category) => category.id === value)
      ? categories.find((category) => category.id === value)
      : undefined;

  const list = selectedInactive ? [selectedInactive, ...activeCategories] : activeCategories;

  return (
    <div className="grid grid-cols-4 gap-4">
      {list.map((category, index) => {
        const selected = category.id === value;
        const tint = TINTS[index % TINTS.length];

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id)}
            className={cn(
              "flex flex-col items-center justify-center rounded-xl p-2 transition-all",
              selected && "scale-105 bg-brand-soft shadow-card",
            )}
          >
            <span
              className={cn(
                "mb-2 flex size-14 items-center justify-center rounded-full transition-colors",
                selected ? "bg-brand text-ink-inverse" : `${tint.bg} ${tint.text}`,
              )}
            >
              <CategoryIcon name={category.icon} className="size-7" />
            </span>
            <span className="line-clamp-1 text-center text-xs text-ink">{category.name}</span>
          </button>
        );
      })}
    </div>
  );
}
