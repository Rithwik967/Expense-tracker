import { readDateParam } from "@/lib/api/params";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { getRepository } from "@/lib/data";
import { getDayView } from "@/lib/services/finance-service";

/** Full breakdown of a single day, for the day-detail view. */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/days/[date]">,
): Promise<Response> {
  return handleRoute(async () => {
    const { date } = await context.params;
    const parsed = readDateParam(new URLSearchParams({ date }), "date");

    const repository = await getRepository();
    return jsonOk(await getDayView(repository, parsed));
  });
}
