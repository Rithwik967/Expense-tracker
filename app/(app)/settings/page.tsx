"use client";

import { Database, HardDrive, UserRound } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { AppLogo } from "@/components/brand/app-logo";
import { MonthBudgetForm } from "@/components/budget/month-budget-form";
import { useAppData } from "@/components/providers/app-data-provider";
import { AppearanceForm } from "@/components/settings/appearance-form";
import { CategoryManager } from "@/components/settings/category-manager";
import { DataManagement } from "@/components/settings/data-management";
import { DefaultsForm } from "@/components/settings/defaults-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { useBudget } from "@/hooks/use-budget";
import { APP_NAME } from "@/lib/constants";

/**
 * Settings.
 *
 * Ordered by how often it is touched: the month's budget first, then the
 * defaults behind it, then the things that are set once. Everything on this
 * screen changes configuration — no control here edits or deletes a
 * transaction, apart from the reset at the bottom, which says so plainly.
 */
export default function SettingsPage() {
  const { month, backend } = useAppData();
  const { budgetFor, resource } = useBudget();

  return (
    <>
      <div className="mb-4 flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Settings &amp; Preferences</h1>
        <p className="max-w-md text-sm text-ink-muted">
          Customize your {APP_NAME} experience and manage your financial data securely.
        </p>
      </div>

      <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
        <div className="space-y-6">
          <Section title="Account">
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-xl bg-surface-muted p-4 shadow-card"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
                <UserRound className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">User profile</span>
                <span className="block text-xs text-ink-muted">Name, photo, and sign out</span>
              </span>
            </Link>
          </Section>

          <Section title="Budget configuration">
            {resource.error ? (
              <ErrorState message={resource.error.message} onRetry={resource.reload} />
            ) : month === null || resource.isLoading ? (
              <FormSkeleton />
            ) : (
              <MonthBudgetForm month={month} existing={budgetFor(month)} />
            )}
          </Section>

          <Section title="Defaults">
            <DefaultsForm />
          </Section>

          <Section title="Organization">
            <CategoryManager />
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Appearance">
            <AppearanceForm />
          </Section>

          <Section title="Data & backup">
            <DataManagement />
          </Section>

          <Section title="About">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <AppLogo className="size-10" />
                  <div className="min-w-0">
                    <CardTitle>{APP_NAME}</CardTitle>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      Your spending is stored on your signed-in account.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-2.5 rounded-control bg-surface-muted px-3 py-2.5">
                  <span
                    aria-hidden
                    className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-ink-muted"
                  >
                    {backend === "supabase" ? (
                      <Database className="size-3.5" />
                    ) : (
                      <HardDrive className="size-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 text-xs">
                    <p className="font-medium text-ink">
                      {backend === "supabase"
                        ? "Stored in Supabase"
                        : backend === "local"
                          ? "Stored in the local development file"
                          : "Checking where your data is stored…"}
                    </p>
                    <p className="mt-0.5 text-ink-muted">
                      {backend === "supabase"
                        ? "Your Postgres database is the source of truth. Balances are calculated from your transactions on every read, never stored."
                        : backend === "local"
                          ? "Data is in .data/store.json in the project. Add your Supabase credentials to .env.local to move it into Postgres."
                          : "One moment."}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="label-caps mb-2 px-1 tracking-widest text-ink-subtle">
        {title}
      </h2>
      {children}
    </section>
  );
}

function FormSkeleton() {
  return (
    <Card className="space-y-3 p-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-20 w-full" />
    </Card>
  );
}
