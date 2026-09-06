import { handleRoute, jsonOk, readJsonBody } from "@/lib/api/response";
import { getRepository } from "@/lib/data";
import { DataError } from "@/lib/data/errors";
import {
  findTransactionShapeErrors,
  transactionPatchSchema,
} from "@/lib/validations/transaction";

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

/**
 * A partial edit, merged onto the stored row.
 *
 * The form always sends every field, but a caller that wants to change only an
 * amount should not have to restate the category — and the cross-field rules
 * still have to hold for the result, so they are checked against the merge
 * rather than against the request.
 */
export async function PATCH(
  request: Request,
  context: RouteContext<"/api/transactions/[id]">,
): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    const patch = transactionPatchSchema.parse(await readJsonBody(request));

    const repository = await getRepository();
    const existing = await repository.getTransaction(id);
    if (!existing) throw DataError.notFound("That transaction");

    const merged = {
      date: patch.date ?? existing.date,
      type: patch.type ?? existing.type,
      amount: patch.amount ?? existing.amount,
      adjustmentDirection:
        patch.adjustmentDirection !== undefined
          ? patch.adjustmentDirection
          : existing.adjustmentDirection,
      categoryId: patch.categoryId !== undefined ? patch.categoryId : existing.categoryId,
      description: patch.description !== undefined ? patch.description : existing.description,
    };

    const errors = findTransactionShapeErrors(merged);
    const firstError = Object.values(errors)[0];
    if (firstError) throw DataError.validation(firstError, errors);

    return jsonOk(await repository.updateTransaction(id, merged));
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
