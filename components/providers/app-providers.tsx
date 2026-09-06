"use client";

import * as React from "react";

import { AppDataProvider } from "@/components/providers/app-data-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/ui/toast";

/** Theme, toasts and shared data, in the order the rest of the tree expects. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppDataProvider>{children}</AppDataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
