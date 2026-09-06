"use client";

import * as React from "react";

/**
 * Appearance.
 *
 * The palette is defined once in `globals.css`: `.dark` on `<html>` swaps the
 * value of every semantic colour token, so no component carries a second set of
 * dark styles and light and dark cannot drift apart.
 *
 * The preference lives in `localStorage`, which React cannot see during a
 * server render. It is therefore read through `useSyncExternalStore`: the
 * server and the hydrating client both start from "system", React re-renders
 * with the stored value immediately afterwards, and there is no mismatch to
 * warn about. The class on `<html>` is applied by the inline script below
 * before first paint, so there is no flash of the wrong colours either.
 */

export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "spending-tracker.theme";

/**
 * Runs before React hydrates. Kept in sync with `resolveTheme` below by hand,
 * which is the price of having no flash of the wrong colours on load.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var d=p==='dark'||((p===null||p==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

const DARK_QUERY = "(prefers-color-scheme: dark)";

/* --- the preference, stored on the device ------------------------------- */

const listeners = new Set<() => void>();

/**
 * Cached because `useSyncExternalStore` compares snapshots by identity and
 * calls `getSnapshot` on every render; re-reading storage each time would be
 * both wasteful and, for a string, indistinguishable — but the cache also
 * guarantees a stable value between notifications.
 */
let cachedPreference: ThemePreference | null = null;

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // Private browsing can make localStorage throw on access.
  }
  return "system";
}

function getPreference(): ThemePreference {
  cachedPreference ??= readStoredPreference();
  return cachedPreference;
}

/** The value the server rendered, and the one React hydrates against. */
function getServerPreference(): ThemePreference {
  return "system";
}

function subscribeToPreference(onChange: () => void): () => void {
  listeners.add(onChange);

  // Another tab of the same app changing the theme should be followed here.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== THEME_STORAGE_KEY) return;
    cachedPreference = readStoredPreference();
    onChange();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function writePreference(next: ThemePreference): void {
  cachedPreference = next;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // A theme that does not survive a reload is better than a crash.
  }
  for (const listener of listeners) listener();
}

/* --- what the operating system is asking for ---------------------------- */

function subscribeToSystem(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSystemPrefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

function getServerSystemPrefersDark(): boolean {
  return false;
}

function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): "light" | "dark" {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

/* --- the provider ------------------------------------------------------- */

interface ThemeContextValue {
  readonly preference: ThemePreference;
  readonly resolved: "light" | "dark";
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = React.useSyncExternalStore(
    subscribeToPreference,
    getPreference,
    getServerPreference,
  );

  const systemPrefersDark = React.useSyncExternalStore(
    subscribeToSystem,
    getSystemPrefersDark,
    getServerSystemPrefersDark,
  );

  const resolved = resolveTheme(preference, systemPrefersDark);

  // Syncing the document is exactly what an effect is for: React does not own
  // the class on <html>, the bootstrap script wrote it first.
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [resolved]);

  const value = React.useMemo(
    () => ({ preference, resolved, setPreference: writePreference }),
    [preference, resolved],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside a ThemeProvider.");
  return context;
}
