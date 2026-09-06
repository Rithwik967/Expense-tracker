import type * as React from "react";

import { AppShell } from "@/components/layout/app-shell";
import { AppDataProvider } from "@/components/providers/app-data-provider";
import { ProfileProvider } from "@/components/providers/profile-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppDataProvider>
      <ProfileProvider>
        <AppShell>{children}</AppShell>
      </ProfileProvider>
    </AppDataProvider>
  );
}

