import { handleRoute, jsonOk, readJsonBody } from "@/lib/api/response";
import { getRepository } from "@/lib/data";
import { monthlyBudgetInputSchema } from "@/lib/validations/budget";

export async function GET(): Promise<Response> {
  return handleRoute(async () => {
    const repository = await getRepository();
    return jsonOk({ budgets: await repository.listMonthlyBudgets() });
  });
}

/**
 * Set one month's budget.
 *
 * Applies to that month onward only in the sense that other months keep their
 * own configuration; no transaction is ever rewritten. `dailyAllowance: null`
 * means "derive it from the budget", which is the normal case.
 */
export async function PUT(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const input = monthlyBudgetInputSchema.parse(await readJsonBody(request));
    const repository = await getRepository();

    return jsonOk(
      await repository.upsertMonthlyBudget({
        monthStart: input.monthStart,
        monthlyBudget: input.monthlyBudget,
        dailyAllowance: input.dailyAllowance,
      }),
    );
  });
}
