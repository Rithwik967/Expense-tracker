"use client";

import * as React from "react";

import { toApiError, type ApiError } from "@/lib/api/client";

/**
 * One fetched thing, with the three states a screen has to tell apart.
 *
 * `isLoading` means "we do not know yet"; `error` means "we asked and failed".
 * They are kept separate from an empty result on purpose — rendering ₹0 because
 * a request failed would be a lie about the user's money, so every screen shows
 * a retry instead.
 */
export interface Resource<T> {
  readonly data: T | null;
  readonly error: ApiError | null;
  /** No data for the current key yet. */
  readonly isLoading: boolean;
  /** Data is on screen and a fresh copy is on its way. */
  readonly isRefreshing: boolean;
  reload: () => void;
}

/** The outcome of the most recent settled request. */
interface ResourceState<T> {
  key: string | null;
  /** Which attempt at `key` produced this, so a reload counts as pending. */
  attempt: number;
  data: T | null;
  error: ApiError | null;
}

/**
 * Fetch whenever `key` changes, and again on `reload()`.
 *
 * Changing the key clears the previous value: showing September's balances
 * under an October heading for a few hundred milliseconds would be worse than a
 * skeleton. A reload at the same key keeps the data visible and only raises
 * `isRefreshing`, so saving a transaction does not blank the screen.
 *
 * Responses from a superseded key are dropped, which is what stops a slow
 * request for a month the user has already navigated away from from landing.
 */
/**
 * Refetch when `token` changes, without clearing what is on screen.
 *
 * Used to fan a successful write out to every list that might now be stale.
 * Folding the token into the resource key instead would blank each list back to
 * a skeleton after every save.
 */
export function useReloadOnChange(reload: () => void, token: number): void {
  const seen = React.useRef(token);

  React.useEffect(() => {
    if (seen.current === token) return;
    seen.current = token;
    reload();
  }, [reload, token]);
}

export function useResource<T>(key: string | null, fetcher: () => Promise<T>): Resource<T> {
  const [state, setState] = React.useState<ResourceState<T>>({
    key: null,
    attempt: 0,
    data: null,
    error: null,
  });
  const [attempt, setAttempt] = React.useState(0);

  /*
   * Held in a ref, and written from an effect rather than during render, so a
   * fetcher closure that is rebuilt every render does not become a refetch
   * loop. Declared above the fetching effect so React runs it first and the
   * fetch always sees the closure from the render that scheduled it.
   */
  const fetcherRef = React.useRef(fetcher);
  React.useEffect(() => {
    fetcherRef.current = fetcher;
  });

  React.useEffect(() => {
    if (key === null) return;

    let active = true;

    fetcherRef.current().then(
      (data) => {
        if (active) setState({ key, attempt, data, error: null });
      },
      (error: unknown) => {
        if (active) {
          setState((current) => ({
            key,
            attempt,
            // A failed reload keeps the figures already on screen.
            data: current.key === key ? current.data : null,
            error: toApiError(error),
          }));
        }
      },
    );

    return () => {
      active = false;
    };
  }, [key, attempt]);

  const reload = React.useCallback(() => setAttempt((value) => value + 1), []);

  /*
   * Everything below is derived. Nothing is assigned when the request starts,
   * which is what lets the effect hold no synchronous state update: "in flight"
   * is simply "the settled result is not for the request we now want".
   */
  const isCurrent = state.key === key;
  const data = isCurrent ? state.data : null;
  const pending = key !== null && !(isCurrent && state.attempt === attempt);

  return {
    data,
    error: isCurrent ? state.error : null,
    // A null key means a prerequisite is still missing (the viewer's date, for
    // instance), which is a wait rather than an empty result.
    isLoading: key === null || (pending && data === null),
    isRefreshing: pending && data !== null,
    reload,
  };
}
