import { handleRoute, jsonOk, readJsonBody } from "@/lib/api/response";
import { getRepository } from "@/lib/data";
import { categoryInputSchema, categoryReorderSchema } from "@/lib/validations/category";

export async function GET(): Promise<Response> {
  return handleRoute(async () => {
    const repository = await getRepository();
    return jsonOk({ categories: await repository.listCategories() });
  });
}

export async function POST(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const input = categoryInputSchema.parse(await readJsonBody(request));
    const repository = await getRepository();

    // Place new categories last unless the caller asked for a position.
    const existing = await repository.listCategories();
    const sortOrder =
      input.sortOrder > 0
        ? input.sortOrder
        : existing.reduce((highest, category) => Math.max(highest, category.sortOrder), 0) + 10;

    const created = await repository.createCategory({ ...input, sortOrder });
    return jsonOk(created, { status: 201 });
  });
}

/** Reorder. Sent as a whole list so the resulting order is unambiguous. */
export async function PUT(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const { orderedIds } = categoryReorderSchema.parse(await readJsonBody(request));
    const repository = await getRepository();
    return jsonOk({ categories: await repository.reorderCategories(orderedIds) });
  });
}
