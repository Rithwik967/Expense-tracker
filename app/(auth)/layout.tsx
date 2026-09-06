import type * as React from "react";

import { AppLogo } from "@/components/brand/app-logo";
import { APP_NAME } from "@/lib/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-surface">
      <header className="pt-safe">
        <div className="mx-auto flex h-16 w-full max-w-md items-center gap-2 px-5">
          <AppLogo />
          <span className="text-sm font-semibold text-ink">{APP_NAME}</span>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-10">{children}</main>
    </div>
  );
}
