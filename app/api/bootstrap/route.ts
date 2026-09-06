import { handleRoute, jsonOk } from "@/lib/api/response";
import { getRepository } from "@/lib/data";
import type { BootstrapView } from "@/types/app";

/** Settings and categories: the slow-changing data every screen needs. */
export async function GET(): Promise<Response> {
  return handleRoute(async () => {
    const repository = await getRepository();
    const [settings, categories, startMonth] = await Promise.all([
      repository.getSettings(),
      repository.listCategories(),
      repository.getEarliestActivityMonth(),
    ]);

    const view: BootstrapView = {
      settings: {
        currency: settings.currency,
        defaultMonthlyBudget: settings.defaultMonthlyBudget,
        defaultDailyAllowance: settings.defaultDailyAllowance,
        monthStartDay: settings.monthStartDay,
      },
      categories,
      backend: repository.backend,
      startMonth,
    };

    return jsonOk(view);
  });
}
