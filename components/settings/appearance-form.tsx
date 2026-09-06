"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme, type ThemePreference } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils/cn";

/**
 * Appearance.
 *
 * The preference is stored on the device rather than in the database.
 */
const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const satisfies ReadonlyArray<{
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}>;

export function AppearanceForm() {
  const { preference, setPreference } = useTheme();

  return (
    <div className="rounded-xl bg-surface-muted p-4 shadow-card">
      <div className="mb-3 flex items-center gap-4">
        <div className="flex size-10 items-center justify-center rounded-full bg-brand-soft/40 text-ink-muted">
          <Sun className="size-5" aria-hidden />
        </div>
        <p className="text-base font-medium text-ink">Theme Preference</p>
      </div>
      <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface-low p-1">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = preference === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setPreference(option.value)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-md px-2 py-3 transition-all",
                selected ? "bg-surface text-ink shadow-sm" : "text-ink-subtle hover:bg-surface/50",
              )}
            >
              <Icon className="size-5" aria-hidden />
              <span className="label-caps">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
