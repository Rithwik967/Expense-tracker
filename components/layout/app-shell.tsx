"use client";

import { Database } from "lucide-react";
import * as React from "react";

import { BottomNav } from "@/components/layout/bottom-nav";
import { TopBar } from "@/components/layout/top-bar";
import { useAppData } from "@/components/providers/app-data-provider";

/**
 * The frame every screen sits in.
 *
 * Content is capped at `max-w-screen-sm` so a phone layout does not stretch
 * into unreadable lines on a laptop, and widens at `lg` where the charts have
 * something to gain from the room. The bottom padding clears the fixed
 * navigation on a phone.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink focus:shadow-raised"
      >
        Skip to content
      </a>

      <TopBar />
      <BackendNotice />

      <main id="main" className="mx-auto w-full max-w-screen-sm flex-1 px-4 pb-28 pt-4 lg:max-w-5xl lg:pb-12">
        {children}
      </main>

      <BottomNav />
    </div>
  );
}

/**
 * Says so when the app is running on the on-disk development store.
 *
 * Silence here would be worse than a strip of text: the user would have no way
 * to know their spending is in a local file rather than in Supabase.
 */
function BackendNotice() {
  const { backend } = useAppData();
  if (backend !== "local") return null;

  return (
    <div className="border-b border-warning/30 bg-warning-soft">
      <p className="mx-auto flex w-full max-w-screen-sm items-start gap-2 px-4 py-2 text-xs text-warning lg:max-w-5xl">
        <Database className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          Saving to the local development store. Add your Supabase URL and anon key to
          <code className="mx-1 font-mono">.env.local</code>
          to store your data in Supabase.
        </span>
      </p>
    </div>
  );
}
