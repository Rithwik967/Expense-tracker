"use client";

import { Receipt, SearchX } from "lucide-react";
import * as React from "react";

import { ListSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { useAppData } from "@/components/providers/app-data-provider";
import {
  EMPTY_FILTERS,
  TransactionFilters,
  countActiveFilters,
  type TransactionFiltersValue,
} from "@/components/transactions/transaction-filters";
import { TransactionFormSheet } from "@/components/transactions/transaction-form-sheet";
import { TransactionList } from "@/components/transactions/transaction-list";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useTransactions } from "@/hooks/use-transactions";
import type { TransactionRecord } from "@/lib/data/types";
import type { DateKey, TransactionType } from "@/lib/finance/types";
import { isDateKey, lastDayOfMonth } from "@/lib/utils/dates";
import { countLabel, formatMonthLabel } from "@/lib/utils/formatting";

/**
 * Transaction history.
 *
 * The list is the record of what actually happened, so it is fetched with the
 * user's filters applied server-side and paged. Editing a row from here changes
 * the same source every other screen reads, which is why saving refreshes the
 * shared month data rather than patching this list in place.
 */
export default function TransactionsPage() {
  const { month } = useAppData();
  const [filters, setFilters] = React.useState<TransactionFiltersValue>(EMPTY_FILTERS);
  const [editing, setEditing] = React.useState<TransactionRecord | null>(null);

  // The list waits for a pause in typing; the input itself never does.
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const query = React.useMemo(
    () => ({
      search: debouncedSearch,
      types:
        filters.type === "all" ? undefined : ([filters.type] as readonly TransactionType[]),
      categoryIds: filters.categoryId ? [filters.categoryId] : undefined,
      from: isDateKey(filters.from) ? (filters.from as DateKey) : undefined,
      to: isDateKey(filters.to) ? (filters.to as DateKey) : undefined,
      sort: filters.sort,
    }),
    [debouncedSearch, filters.type, filters.categoryId, filters.from, filters.to, filters.sort],
  );

  const { transactions, total, hasMore, isLoadingMore, loadMore, resource } =
    useTransactions(query);

  const activeFilters = countActiveFilters(filters);

  return (
    <>
      <PageHeader
        title="Transactions"
        description={
          resource.data ? countLabel(total, "transaction") : "Everything you have recorded."
        }
      />

      <div className="space-y-3">
        <TransactionFilters
          value={filters}
          onChange={setFilters}
          monthRange={
            month
              ? { from: month, to: lastDayOfMonth(month), label: formatMonthLabel(month, "short") }
              : undefined
          }
        />

        {resource.error ? (
          <ErrorState message={resource.error.message} onRetry={resource.reload} />
        ) : resource.isLoading ? (
          <ListSkeleton rows={6} />
        ) : transactions.length === 0 ? (
          <Card>
            {activeFilters > 0 ? (
              <EmptyState
                icon={SearchX}
                title="Nothing matches those filters"
                description="Try a different category, a wider date range, or clear the search."
                action={
                  <Button variant="outline" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
                    Reset filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Receipt}
                title="No transactions yet"
                description="Record your first expense and every balance from that day onward will follow from it."
              />
            )}
          </Card>
        ) : (
          <>
            <TransactionList transactions={transactions} onSelect={setEditing} />

            {hasMore ? (
              <Button variant="outline" block onClick={loadMore} disabled={isLoadingMore}>
                {isLoadingMore ? "Loading…" : `Show more (${total - transactions.length} left)`}
              </Button>
            ) : (
              <p className="pb-2 text-center text-xs text-ink-subtle">
                Showing all {countLabel(total, "transaction").toLowerCase()}.
              </p>
            )}
          </>
        )}
      </div>

      <TransactionFormSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        transaction={editing}
      />
    </>
  );
}
