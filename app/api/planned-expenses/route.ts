import type { NextRequest } from "next/server";

import { readListParam, readOptionalDateParam } from "@/lib/api/params";
import { handleRoute, jsonOk, readJsonBody } from "@/lib/api/response";
import { getRepository } from "@/lib/data";
import { PLANNED_EXPENSE_STATUSES, type PlannedExpenseStatus } from "@/lib/finance/types";
import { plannedExpenseInputSchema } from "@/lib/validations/budget";

export async function GET(request: NextRequest): Promise<Response> {
  return handleRoute(async () => {
    const params = request.nextUrl.searchParams;
    const rawStatuses = readListParam(params, "statuses");
    const statuses = rawStatuses?.filter((value): value is PlannedExpenseStatus =>
      (PLANNED_EXPENSE_STATUSES as readonly string[]).includes(value),
    );

    const repository = await getRepository();
    const plannedExpenses = await repository.listPlannedExpenses({
      from: readOptionalDateParam(params, "from"),
      to: readOptionalDateParam(params, "to"),
      statuses: statuses?.length ? statuses : undefined,
    });

    return jsonOk({ plannedExpenses });
  });
}

export async function POST(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const input = plannedExpenseInputSchema.parse(await readJsonBody(request));
    const repository = await getRepository();

    const created = await repository.createPlannedExpense({
      plannedDate: input.plannedDate,
      amount: input.amount,
      categoryId: input.categoryId,
      description: input.description,
      status: input.status,
    });

    return jsonOk(created, { status: 201 });
  });
}
