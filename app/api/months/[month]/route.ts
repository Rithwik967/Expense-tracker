import type { NextRequest } from "next/server";

import { readMonthParam, readToday } from "@/lib/api/params";
import { handleRoute, jsonOk } from "@/lib/api/response";
import { getRepository } from "@/lib/data";
import { getMonthView } from "@/lib/services/finance-service";

/**
 * Everything Home, Calendar and Insights need for one month.
 *
 * A single request rather than one per widget, so every figure on screen comes
 * from the same evaluation of the ledger and cannot drift.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/months/[month]">,
): Promise<Response> {
  return handleRoute(async () => {
    const { month } = await context.params;
    const parsedMonth = readMonthParam(month);
    const today = readToday(request.nextUrl.searchParams);

    const repository = await getRepository();
    return jsonOk(await getMonthView(repository, parsedMonth, today));
  });
}
