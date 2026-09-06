import type * as React from "react";

import { AppShell } from "@/components/layout/app-shell";

/**
 * The signed-in-app frame. A route-group layout has no path of its own, so the
 * generated `LayoutProps` helper does not cover it.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
