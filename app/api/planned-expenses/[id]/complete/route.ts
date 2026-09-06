import { handleRoute, jsonOk } from "@/lib/api/response";
import { getRepository } from "@/lib/data";
import { DataError } from "@/lib/data/errors";
import { dateKeySchema } from "@/lib/validations/shared";
import { z } from "zod";

const completeSchema = z.object({
  /** Defaults to the plan's own date when the caller does not say otherwise. */
  date: dateKeySchema.optional(),
});

/**
 * Turn a plan into real spending.
 *
 * A plan is an intention; only a transaction moves money. This creates the
 * expense and records its id on the plan, and the unique index on
 * `converted_transaction_id` plus the guard below mean the same plan cannot be
 * marked as spent twice and produce two expenses.
 */
export async function POST(
  request: Request,
  context: RouteContext<"/api/planned-expenses/[id]/complete">,
): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    const body = await request.text();
    const { date } = completeSchema.parse(body ? JSON.parse(body) : {});

    const repository = await getRepository();
    const planned = await repository.getPlannedExpense(id);
    if (!planned) throw DataError.notFound("That planned expense");

    if (planned.status === "completed" || planned.convertedTransactionId) {
      throw DataError.conflict("That plan has already been marked as spent.");
    }
    if (planned.status === "cancelled") {
      throw DataError.conflict("That plan was cancelled. Reopen it before marking it as spent.");
    }
    if (!planned.categoryId) {
      throw DataError.validation("Give the plan a category before marking it as spent.");
    }

    const transaction = await repository.createTransaction({
      date: date ?? planned.plannedDate,
      type: "expense",
      amount: planned.amount,
      adjustmentDirection: null,
      categoryId: planned.categoryId,
      description: planned.description,
    });

    try {
      const updated = await repository.updatePlannedExpense(id, {
        status: "completed",
        convertedTransactionId: transaction.id,
      });
      return jsonOk({ plannedExpense: updated, transaction });
    } catch (error) {
      // Do not leave an orphaned expense behind if the link fails.
      await repository.deleteTransaction(transaction.id).catch(() => undefined);
      throw error;
    }
  });
}
