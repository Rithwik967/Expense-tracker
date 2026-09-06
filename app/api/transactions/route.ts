import type { NextRequest } from "next/server";

import { readIntParam, readListParam, readOptionalDateParam } from "@/lib/api/params";
import { handleRoute, jsonOk, readJsonBody } from "@/lib/api/response";
import { TRANSACTIONS_PAGE_SIZE } from "@/lib/constants";
import { getRepository } from "@/lib/data";
import { DataError } from "@/lib/data/errors";
import type { TransactionFilter } from "@/lib/data/types";
import { TRANSACTION_TYPES, type TransactionType } from "@/lib/finance/types";
import { transactionInputSchema } from "@/lib/validations/transaction";
import type { TransactionListView } from "@/types/app";

const SORTS = ["date-desc", "date-asc", "amount-desc", "amount-asc"] as const;

function readFilter(params: URLSearchParams): TransactionFilter {
  const rawTypes = readListParam(params, "types");
  const types = rawTypes?.filter((value): value is TransactionType =>
    (TRANSACTION_TYPES as readonly string[]).includes(value),
  );

  const rawSort = params.get("sort");
  const sort = SORTS.find((candidate) => candidate === rawSort);

  return {
    from: readOptionalDateParam(params, "from"),
    to: readOptionalDateParam(params, "to"),
    types: types?.length ? types : undefined,
    categoryIds: readListParam(params, "categories"),
    search: params.get("search") ?? undefined,
    limit: readIntParam(params, "limit", { min: 1, max: 500, fallback: TRANSACTIONS_PAGE_SIZE }),
    offset: readIntParam(params, "offset", { min: 0, fallback: 0 }),
    sort,
  };
}

export async function GET(request: NextRequest): Promise<Response> {
  return handleRoute(async () => {
    const filter = readFilter(request.nextUrl.searchParams);
    const repository = await getRepository();

    // The count uses the same filter minus paging, so "showing 50 of 214" is
    // always describing the same set the list came from.
    const [transactions, total] = await Promise.all([
      repository.listTransactions(filter),
      repository.countTransactions({ ...filter, limit: undefined, offset: undefined }),
    ]);

    const view: TransactionListView = {
      transactions,
      total,
      hasMore: (filter.offset ?? 0) + transactions.length < total,
    };

    return jsonOk(view);
  });
}

export async function POST(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const body = await readJsonBody(request);
    const input = transactionInputSchema.parse(body);

    const repository = await getRepository();

    if (input.categoryId) {
      const categories = await repository.listCategories();
      if (!categories.some((category) => category.id === input.categoryId)) {
        throw DataError.validation("That category no longer exists.");
      }
    }

    const created = await repository.createTransaction({
      date: input.date,
      type: input.type,
      amount: input.amount,
      adjustmentDirection: input.adjustmentDirection,
      categoryId: input.categoryId,
      description: input.description,
    });

    return jsonOk(created, { status: 201 });
  });
}
