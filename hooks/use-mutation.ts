"use client";

import * as React from "react";

import { toApiError, type ApiError } from "@/lib/api/client";

/**
 * Run one write and expose what a form needs while it is in flight.
 *
 * `run` resolves to a tagged result rather than throwing, and rather than
 * asking the caller to read `error` afterwards: the state setter has not
 * committed by the time the promise resolves, so reading it from the same
 * closure would see the previous render's value. The result carries the error
 * the caller needs, and `error` exists for rendering.
 *
 * Server-side validation comes back as a message plus a map of field errors, so
 * a rule the browser did not check — a category retired in another tab, a
 * duplicate name — still lands on the right input instead of a generic banner.
 */
export type MutationResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export interface Mutation<TArgs extends unknown[], TResult> {
  readonly isPending: boolean;
  readonly error: ApiError | null;
  readonly fieldErrors: Record<string, string>;
  run: (...args: TArgs) => Promise<MutationResult<TResult>>;
  reset: () => void;
}

export function useMutation<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
): Mutation<TArgs, TResult> {
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<ApiError | null>(null);
  const mounted = React.useRef(true);

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /*
   * The action is usually an inline closure, so `run` reads it from a ref to
   * stay referentially stable for the components that pass it to a memoised
   * child. Written from an effect, since a ref must not be touched mid-render.
   */
  const actionRef = React.useRef(action);
  React.useEffect(() => {
    actionRef.current = action;
  });

  const run = React.useCallback(async (...args: TArgs): Promise<MutationResult<TResult>> => {
    setIsPending(true);
    setError(null);

    try {
      const data = await actionRef.current(...args);
      return { ok: true, data };
    } catch (caught) {
      const apiError = toApiError(caught);
      if (mounted.current) setError(apiError);
      return { ok: false, error: apiError };
    } finally {
      if (mounted.current) setIsPending(false);
    }
  }, []);

  const reset = React.useCallback(() => setError(null), []);

  return { isPending, error, fieldErrors: error?.fieldErrors ?? {}, run, reset };
}
