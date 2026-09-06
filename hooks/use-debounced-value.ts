"use client";

import * as React from "react";

/**
 * Delay a value until it stops changing.
 *
 * Used for the search box: the input stays responsive to every keystroke while
 * the request waits for a pause, so typing "groceries" is one query instead of
 * nine.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
