"use client";

import * as React from "react";

/**
 * Appearance.
 *
 * The palette is defined once in `globals.css`: `.dark` on `<html>` swaps the
 * value of every semantic colour token, so no component carries a second set of
 * dark styles and light and dark cannot drift apart.
 *
 * The preference is read in an effect rather than during render. Reading
 * `localStorage` while rendering would make the server and client disagree and
 * produce a hydration warning; the inline script in the document head applies
 * the class before first paint, so there is no flash of the wrong theme either.
 */

export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "spending-tracker.theme";

/**
 * Runs before React hydrates. Kept in sync with `applyTheme` below by hand,
 * which is the price of having no flash of the wrong colours on load.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var d=p==='dark'||((p===null||p==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

interface ThemeContextValue {
  readonly preference: ThemePreference;
  readonly resolved: "light" | "dark";
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(preference: ThemePreference): "light" | "dark" {
  const dark = preference === "dark" || (preference === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
  return dark ? "dark" : "light";
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // Private browsing can make localStorage throw on access.
  }
  return "system";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = React.useState<ThemePreference>("system");
  const [resolved, setResolved] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    const stored = readStoredPreference();
    setPreferenceState(stored);
    setResolved(applyTheme(stored));
  }, []);

  // Follow the operating system while the preference is "system".
  React.useEffect(() => {
    if (preference !== "system") return;

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(applyTheme("system"));
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = React.useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    setResolved(applyTheme(next));
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // A theme that does not survive a reload is better than a crash.
    }
  }, []);

  const value = React.useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside a ThemeProvider.");
  return context;
}
