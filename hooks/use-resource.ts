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

interface ResourceState<T> {
  key: string | null;
  data: T | null;
  error: ApiError | null;
  pending: boolean;
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
    data: null,
    error: null,
    pending: key !== null,
  });
  const [nonce, setNonce] = React.useState(0);

  // Held in a ref so a fetcher closure that changes on every render does not
  // become a refetch loop; `key` is the only thing that decides when to refetch.
  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;

  React.useEffect(() => {
    if (key === null) return;

    let active = true;
    setState((current) => ({
      key,
      data: current.key === key ? current.data : null,
      error: null,
      pending: true,
    }));

    fetcherRef.current().then(
      (data) => {
        if (active) setState({ key, data, error: null, pending: false });
      },
      (error: unknown) => {
        if (active) {
          setState((current) => ({
            key,
            data: current.key === key ? current.data : null,
            error: toApiError(error),
            pending: false,
          }));
        }
      },
    );

    return () => {
      active = false;
    };
  }, [key, nonce]);

  const reload = React.useCallback(() => setNonce((value) => value + 1), []);

  const isCurrent = state.key === key;
  const data = isCurrent ? state.data : null;

  return {
    data,
    error: isCurrent ? state.error : null,
    // A null key means a prerequisite is still missing (the viewer's date, for
    // instance), which is a wait rather than an empty result.
    isLoading: key === null || ((state.pending || !isCurrent) && data === null),
    isRefreshing: state.pending && data !== null,
    reload,
  };
}
