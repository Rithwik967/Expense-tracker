"use client";

import * as React from "react";

import { useAppData } from "@/components/providers/app-data-provider";
import { useMutation } from "@/hooks/use-mutation";
import { useReloadOnChange, useResource, type Resource } from "@/hooks/use-resource";
import { api } from "@/lib/api/client";
import { TRANSACTIONS_PAGE_SIZE } from "@/lib/constants";
import type { TransactionRecord } from "@/lib/data/types";
import { toDecimalString } from "@/lib/finance/money";
import type { DateKey, TransactionType } from "@/lib/finance/types";
import type { TransactionListView } from "@/types/app";

/**
 * The transaction list, filtered on the server.
 *
 * Filtering and paging are query parameters rather than an in-memory filter
 * over everything, so a year of history is never downloaded to show one month.
 * The page size grows in place as the user asks for more, which keeps the rows
 * already on screen exactly where they were.
 */

export type TransactionSort = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

export interface TransactionQuery {
  readonly from?: DateKey;
  readonly to?: DateKey;
  readonly types?: readonly TransactionType[];
  readonly categoryIds?: readonly string[];
  readonly search?: string;
  readonly sort?: TransactionSort;
  readonly pageSize?: number;
}

export interface TransactionsResult {
  readonly transactions: readonly TransactionRecord[];
  readonly total: number;
  readonly hasMore: boolean;
  readonly isLoadingMore: boolean;
  loadMore: () => void;
  readonly resource: Resource<TransactionListView>;
}

export function useTransactions(query: TransactionQuery): TransactionsResult {
  const { revision } = useAppData();
  const pageSize = query.pageSize ?? TRANSACTIONS_PAGE_SIZE;
  const [limit, setLimit] = React.useState(pageSize);

  const params = React.useMemo(
    () => ({
      from: query.from,
      to: query.to,
      types: query.types?.length ? query.types.join(",") : undefined,
      categories: query.categoryIds?.length ? query.categoryIds.join(",") : undefined,
      search: query.search?.trim() ? query.search.trim() : undefined,
      sort: query.sort,
    }),
    [query.from, query.to, query.types, query.categoryIds, query.search, query.sort],
  );

  // A changed filter is a different question; start again from the first page.
  const filterKey = JSON.stringify(params);
  React.useEffect(() => {
    setLimit(pageSize);
  }, [filterKey, pageSize]);

  /*
   * `limit` is deliberately outside the resource key. Asking for more rows is a
   * continuation of the same list, so the rows already on screen stay put and
   * only `isRefreshing` changes; folding the limit into the key would drop the
   * list back to a skeleton on every "Show more".
   */
  const resource = useResource<TransactionListView>(`transactions:${filterKey}`, () =>
    api.transactions({ ...params, limit, offset: 0 }),
  );

  useReloadOnChange(resource.reload, revision);
  useReloadOnChange(resource.reload, limit);

  const loadMore = React.useCallback(
    () => setLimit((current) => current + pageSize),
    [pageSize],
  );

  return {
    transactions: resource.data?.transactions ?? [],
    total: resource.data?.total ?? 0,
    hasMore: resource.data?.hasMore ?? false,
    isLoadingMore: resource.isRefreshing && limit > pageSize,
    loadMore,
    resource,
  };
}

/**
 * Create, edit and delete.
 *
 * Every one of these refreshes the shared month data afterwards. A transaction
 * dated three weeks ago changes that day's balance and every balance after it,
 * so there is nothing to patch locally — the server recomputes the chain and
 * each screen re-reads it.
 */
export function useTransactionActions() {
  const { refresh } = useAppData();

  const create = useMutation(async (body: unknown) => {
    const created = await api.createTransaction(body);
    refresh();
    return created;
  });

  const update = useMutation(async (id: string, body: unknown) => {
    const updated = await api.updateTransaction(id, body);
    refresh();
    return updated;
  });

  const remove = useMutation(async (id: string) => {
    const result = await api.deleteTransaction(id);
    refresh();
    return result;
  });

  /**
   * Undo a delete by writing the row back.
   *
   * The restored transaction gets a fresh id — the original row is gone — but
   * every value that affects a balance is identical, so the ledger ends up
   * exactly where it was.
   */
  const restore = useMutation(async (transaction: TransactionRecord) => {
    const created = await api.createTransaction({
      date: transaction.date,
      type: transaction.type,
      amount: toDecimalString(transaction.amount),
      adjustmentDirection: transaction.adjustmentDirection,
      categoryId: transaction.categoryId,
      description: transaction.description ?? "",
    });
    refresh();
    return created;
  });

  return { create, update, remove, restore };
}

/** Group rows into date buckets, newest date first, for a sectioned list. */
export function groupByDate(
  transactions: readonly TransactionRecord[],
): Array<{ date: DateKey; transactions: TransactionRecord[] }> {
  const groups = new Map<DateKey, TransactionRecord[]>();

  for (const transaction of transactions) {
    const bucket = groups.get(transaction.date);
    if (bucket) bucket.push(transaction);
    else groups.set(transaction.date, [transaction]);
  }

  return [...groups.entries()]
    .map(([date, rows]) => ({ date, transactions: rows }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
