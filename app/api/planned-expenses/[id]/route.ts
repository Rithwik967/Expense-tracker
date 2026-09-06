import { handleRoute, jsonOk, readJsonBody } from "@/lib/api/response";
import { getRepository } from "@/lib/data";
import { DataError } from "@/lib/data/errors";
import { plannedExpensePatchSchema } from "@/lib/validations/budget";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/planned-expenses/[id]">,
): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    const patch = plannedExpensePatchSchema.parse(await readJsonBody(request));

    const repository = await getRepository();
    return jsonOk(await repository.updatePlannedExpense(id, patch));
  });
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/planned-expenses/[id]">,
): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    const repository = await getRepository();

    const existing = await repository.getPlannedExpense(id);
    if (!existing) throw DataError.notFound("That planned expense");

    await repository.deletePlannedExpense(id);
    return jsonOk({ deleted: existing });
  });
}
