"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import * as React from "react";

import { useTheme, type ThemePreference } from "@/components/providers/theme-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";

/**
 * Appearance.
 *
 * The preference is stored on the device rather than in the database: it
 * describes this screen, not the user's money, and a phone in a dark room and a
 * laptop in daylight should be allowed to disagree.
 */
const OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const satisfies ReadonlyArray<{ value: ThemePreference; label: string }>;

const ICONS: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

export function AppearanceForm() {
  const { preference, resolved, setPreference } = useTheme();
  const Icon = ICONS[preference];

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Appearance</CardTitle>
          <p className="mt-0.5 text-xs text-ink-muted">Saved on this device.</p>
        </div>
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-muted"
        >
          <Icon className="size-4" />
        </span>
      </CardHeader>

      <CardContent className="space-y-2">
        <Segmented
          label="Theme"
          options={OPTIONS}
          value={preference}
          onChange={setPreference}
        />
        <p className="text-xs text-ink-subtle">
          {preference === "system"
            ? `Following your device, which is currently ${resolved}.`
            : `Always ${preference}.`}
        </p>
      </CardContent>
    </Card>
  );
}
