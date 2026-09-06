"use client";

import * as React from "react";

import { useResource, type Resource } from "@/hooks/use-resource";
import { api } from "@/lib/api/client";
import type { CategoryRecord } from "@/lib/data/types";
import type { DateKey, MonthKey } from "@/lib/finance/types";
import { addMonthsToKey, currentMonthKey, todayKey } from "@/lib/utils/dates";
import type { AppSettingsView, BootstrapView, MonthView } from "@/types/app";

/**
 * The application's shared state: which month is on screen, what today is, and
 * the two requests every screen depends on.
 *
 * Two things live here rather than in each screen. First, `today` comes from
 * the *viewer's* clock and is passed to the server with every month request: a
 * server in UTC and a phone in IST disagree for five and a half hours a day,
 * and during that window a server-derived date would show the wrong day's
 * balance. Second, one month request feeds Home, Calendar and Insights, so the
 * three cannot disagree about a total and the server evaluates the ledger once
 * instead of three times.
 *
 * `revision` is bumped after every successful write. Lists elsewhere in the
 * tree watch it and refetch, which is how an edit to a three-week-old expense
 * reaches every screen without any of them sharing calculation logic.
 */

interface AppDataContextValue {
  /** The viewer's current date. `null` until the client has mounted. */
  readonly today: DateKey | null;
  /** The month being viewed. `null` until `today` is known. */
  readonly month: MonthKey | null;
  readonly isCurrentMonth: boolean;
  setMonth: (month: MonthKey) => void;
  shiftMonth: (delta: number) => void;
  goToCurrentMonth: () => void;

  readonly bootstrap: Resource<BootstrapView>;
  readonly monthView: Resource<MonthView>;

  readonly settings: AppSettingsView | null;
  readonly currency: string;
  readonly categories: readonly CategoryRecord[];
  readonly activeCategories: readonly CategoryRecord[];
  categoryName: (id: string | null) => string;
  categoryIcon: (id: string | null) => string | null;

  readonly backend: "supabase" | "local" | null;
  readonly startMonth: MonthKey | null;

  /** Token that changes after every successful write. */
  readonly revision: number;
  /** Re-read everything derived from the data the user just changed. */
  refresh: () => void;
}

const AppDataContext = React.createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [today, setToday] = React.useState<DateKey | null>(null);
  const [month, setMonthState] = React.useState<MonthKey | null>(null);
  const [revision, setRevision] = React.useState(0);

  /*
   * Resolve the date after mount, then keep watching it. An app left open
   * overnight, or backgrounded on a phone and reopened the next morning, would
   * otherwise keep calling yesterday "today".
   */
  React.useEffect(() => {
    const sync = () => {
      const date = todayKey();
      setToday((current) => (current === date ? current : date));
      setMonthState((current) => current ?? currentMonthKey());
    };

    sync();

    const interval = window.setInterval(sync, 60_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const bootstrap = useResource<BootstrapView>("bootstrap", api.bootstrap);

  const monthKey = month && today ? `month:${month}:${today}` : null;
  const monthView = useResource<MonthView>(monthKey, () =>
    api.month(month as MonthKey, today as DateKey),
  );

  const { reload: reloadMonth } = monthView;
  const { reload: reloadBootstrap } = bootstrap;

  const refresh = React.useCallback(() => {
    reloadMonth();
    reloadBootstrap();
    setRevision((value) => value + 1);
  }, [reloadMonth, reloadBootstrap]);

  const setMonth = React.useCallback((next: MonthKey) => setMonthState(next), []);

  const shiftMonth = React.useCallback((delta: number) => {
    setMonthState((current) => (current ? addMonthsToKey(current, delta) : current));
  }, []);

  const goToCurrentMonth = React.useCallback(() => setMonthState(currentMonthKey()), []);

  const categories = bootstrap.data?.categories ?? [];
  const categoriesById = React.useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const activeCategories = React.useMemo(
    () => categories.filter((category) => category.isActive),
    [categories],
  );

  /*
   * A retired category still has to name itself: transactions recorded against
   * it keep their label rather than turning into "Uncategorised".
   */
  const categoryName = React.useCallback(
    (id: string | null) => (id ? (categoriesById.get(id)?.name ?? "Removed category") : "—"),
    [categoriesById],
  );

  const categoryIcon = React.useCallback(
    (id: string | null) => (id ? (categoriesById.get(id)?.icon ?? null) : null),
    [categoriesById],
  );

  const value = React.useMemo<AppDataContextValue>(
    () => ({
      today,
      month,
      isCurrentMonth: month !== null && today !== null && today.slice(0, 7) === month.slice(0, 7),
      setMonth,
      shiftMonth,
      goToCurrentMonth,
      bootstrap,
      monthView,
      settings: bootstrap.data?.settings ?? null,
      currency: bootstrap.data?.settings.currency ?? "INR",
      categories,
      activeCategories,
      categoryName,
      categoryIcon,
      backend: bootstrap.data?.backend ?? null,
      startMonth: bootstrap.data?.startMonth ?? null,
      revision,
      refresh,
    }),
    [
      today,
      month,
      setMonth,
      shiftMonth,
      goToCurrentMonth,
      bootstrap,
      monthView,
      categories,
      activeCategories,
      categoryName,
      categoryIcon,
      revision,
      refresh,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const context = React.useContext(AppDataContext);
  if (!context) throw new Error("useAppData must be used inside an AppDataProvider.");
  return context;
}
