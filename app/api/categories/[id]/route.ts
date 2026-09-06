import { handleRoute, jsonOk, readJsonBody } from "@/lib/api/response";
import { getRepository } from "@/lib/data";
import { categoryPatchSchema } from "@/lib/validations/category";

/**
 * Rename, retire and restore.
 *
 * There is no DELETE. A category referenced by history is protected by an
 * ON DELETE RESTRICT foreign key, so removing it would either fail or orphan
 * past transactions. Setting `isActive: false` hides it from pickers while
 * every historical transaction keeps showing its category.
 */
export async function PATCH(
  request: Request,
  context: RouteContext<"/api/categories/[id]">,
): Promise<Response> {
  return handleRoute(async () => {
    const { id } = await context.params;
    const patch = categoryPatchSchema.parse(await readJsonBody(request));

    const repository = await getRepository();
    return jsonOk(await repository.updateCategory(id, patch));
  });
}
