import type { NextRequest } from "next/server";

import { handleRoute, jsonOk, readJsonBody } from "@/lib/api/response";
import { getRepository } from "@/lib/data";
import { DataError } from "@/lib/data/errors";
import { buildBackupFile, buildTransactionCsv, parseBackupFile } from "@/lib/services/backup";
import { z } from "zod";

/** Export everything, as JSON for a restorable backup or CSV for analysis. */
export async function GET(request: NextRequest): Promise<Response> {
  return handleRoute(async () => {
    const format = request.nextUrl.searchParams.get("format") ?? "json";
    const repository = await getRepository();
    const payload = await repository.exportAll();
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      const csv = buildTransactionCsv(payload.transactions, payload.categories);
      return new Response(csv, {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="transactions-${stamp}.csv"`,
          "cache-control": "no-store",
        },
      });
    }

    if (format !== "json") {
      throw DataError.validation('Choose either "json" or "csv".');
    }

    return new Response(`${JSON.stringify(buildBackupFile(payload), null, 2)}\n`, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="spending-tracker-${stamp}.json"`,
        "cache-control": "no-store",
      },
    });
  });
}

const importSchema = z.object({
  backup: z.unknown(),
  /**
   * A dry run validates and reports without writing. The UI always previews
   * first, so the user confirms against a real summary of the file rather than
   * a promise about it.
   */
  confirm: z.boolean().default(false),
});

export async function PUT(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const { backup, confirm } = importSchema.parse(await readJsonBody(request));
    const { payload, summary } = parseBackupFile(backup);

    if (!confirm) {
      return jsonOk({ applied: false, summary });
    }

    const repository = await getRepository();
    await repository.replaceAll(payload);
    return jsonOk({ applied: true, summary });
  });
}

const resetSchema = z.object({
  /** Typed by the user. A slip of the finger must not erase everything. */
  confirmation: z.literal("DELETE", {
    message: 'Type DELETE exactly to confirm.',
  }),
});

export async function DELETE(request: Request): Promise<Response> {
  return handleRoute(async () => {
    resetSchema.parse(await readJsonBody(request));
    const repository = await getRepository();
    await repository.resetAll();
    return jsonOk({ reset: true });
  });
}
