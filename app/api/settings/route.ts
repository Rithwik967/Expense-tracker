import { handleRoute, jsonOk, readJsonBody } from "@/lib/api/response";
import { getRepository } from "@/lib/data";
import { settingsInputSchema } from "@/lib/validations/budget";

export async function GET(): Promise<Response> {
  return handleRoute(async () => {
    const repository = await getRepository();
    return jsonOk(await repository.getSettings());
  });
}

/**
 * Change the defaults.
 *
 * Nothing historical is rewritten. Months that already have their own
 * `monthly_budgets` row keep it; only months that fall back to the default see
 * a different figure, and their balances are recomputed on the next read.
 */
export async function PATCH(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const patch = settingsInputSchema.parse(await readJsonBody(request));
    const repository = await getRepository();
    return jsonOk(await repository.updateSettings(patch));
  });
}
