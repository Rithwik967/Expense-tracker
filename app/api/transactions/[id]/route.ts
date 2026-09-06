import { handleRoute, jsonOk, readJsonBody } from "@/lib/api/response";
import { getRepository } from "@/lib/data";
import { DataError } from "@/lib/data/errors";
import { transactionInputSchema } from "@/lib/validations/transaction";

/**
 * Editing and deleting.
 *
 * Neither operation touches a stored balance, because none exists. Changing an
 * amount, a category or a date — including moving a transaction to a different
 * month — is enough on its own for every later day to recalculate on the next
 * read.
 */

export async function GET(
  _request: Request,
  context: RouteContext<"/api/transactions/[id]">,
): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    const repository = await getRepository();
    const transaction = await repository.getTransaction(id);
    if (!transaction) throw DataError.notFound("That transaction");
    return jsonOk(transaction);
  });
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/transactions/[id]">,
): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    const body = await readJsonBody(request);
    const input = transactionInputSchema.parse(body);

    const repository = await getRepository();
    const updated = await repository.updateTransaction(id, {
      date: input.date,
      type: input.type,
      amount: input.amount,
      adjustmentDirection: input.adjustmentDirection,
      categoryId: input.categoryId,
      description: input.description,
    });

    return jsonOk(updated);
  });
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/transactions/[id]">,
): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    const repository = await getRepository();

    // Returned so the client can offer Undo by recreating it verbatim.
    const existing = await repository.getTransaction(id);
    if (!existing) throw DataError.notFound("That transaction");

    await repository.deleteTransaction(id);
    return jsonOk({ deleted: existing });
  });
}
