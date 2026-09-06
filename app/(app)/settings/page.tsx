"use client";

import { Database, HardDrive } from "lucide-react";
import * as React from "react";

import { MonthBudgetForm } from "@/components/budget/month-budget-form";
import { MonthSwitcher } from "@/components/layout/month-switcher";
import { PageHeader } from "@/components/layout/page-header";
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
      <PageHeader title="Settings" description="Budget, categories and your data." />

      <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6 lg:space-y-0">
        <div className="space-y-6">
          <Section title="Budget">
            <div className="mb-2 rounded-control border border-border bg-surface px-1">
              <MonthSwitcher />
            </div>
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

          <Section title="Categories">
            <CategoryManager />
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Appearance">
            <AppearanceForm />
          </Section>

          <Section title="Data">
            <DataManagement />
          </Section>

          <Section title="About">
            <Card>
              <CardHeader>
                <div className="min-w-0">
                  <CardTitle>{APP_NAME}</CardTitle>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    A private tracker for one person. No account, no sharing.
                  </p>
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
      <h2 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-ink-subtle">
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
