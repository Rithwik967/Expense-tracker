"use client";

import * as React from "react";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * `false` on the server and during hydration, `true` from the first render
 * afterwards.
 *
 * Needed by anything that has to reach for `document` — a portal, in practice.
 * Expressed as an external store rather than a `useState` set from an effect so
 * React treats the two values as expected rather than as a mismatch, and so the
 * switch happens in the same commit as hydration instead of one render later.
 */
export function useIsHydrated(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
