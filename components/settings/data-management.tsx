"use client";

import { Download, FileJson, FileSpreadsheet, Trash2, Upload } from "lucide-react";
import * as React from "react";

import { useAppData } from "@/components/providers/app-data-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Sheet } from "@/components/ui/sheet";
import { InlineError } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useMutation } from "@/hooks/use-mutation";
import { api, exportUrls, type ImportSummary } from "@/lib/api/client";
import { countLabel, formatDayLabel, formatMonthLabel } from "@/lib/utils/formatting";

/**
 * Backup, restore and reset.
 *
 * Import is deliberately two steps. The file is sent to the server first with
 * `confirm: false`, which validates it and reports what it holds without
 * writing anything; only after the user has seen that summary is the same file
 * sent again to be applied. A malformed or half-matching file therefore fails
 * before it can replace the data the user already has.
 */
export function DataManagement() {
  const { refresh } = useAppData();
  const toast = useToast();

  const inputRef = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState<{
    fileName: string;
    backup: unknown;
    summary: ImportSummary;
  } | null>(null);
  const [readError, setReadError] = React.useState<string | null>(null);
  const [resetting, setResetting] = React.useState(false);

  const preview = useMutation(api.previewImport);
  const apply = useMutation(api.applyImport);
  const reset = useMutation(api.resetAll);

  const onFileChosen = async (file: File) => {
    setReadError(null);

    let backup: unknown;
    try {
      backup = JSON.parse(await file.text());
    } catch {
      setReadError("That file is not valid JSON. Choose the .json backup this app exported.");
      return;
    }

    const result = await preview.run(backup);
    if (!result.ok) {
      setReadError(result.error.message);
      return;
    }

    setPending({ fileName: file.name, backup, summary: result.data.summary });
  };

  const confirmImport = async () => {
    if (!pending) return;

    const result = await apply.run(pending.backup);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }

    setPending(null);
    refresh();
    toast.success(`Restored ${countLabel(result.data.summary.transactions, "transaction")}.`);
  };

  const confirmReset = async () => {
    const result = await reset.run();
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }

    setResetting(false);
    refresh();
    toast.success("All data deleted. Your default categories are back.");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Your data</CardTitle>
            <p className="mt-0.5 text-xs text-ink-muted">
              Everything lives in one database. Keep a backup.
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Export</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" asChild>
                <a href={exportUrls.json} download>
                  <FileJson aria-hidden />
                  Full backup (JSON)
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={exportUrls.csv} download>
                  <FileSpreadsheet aria-hidden />
                  Transactions (CSV)
                </a>
              </Button>
            </div>
            <p className="text-xs text-ink-subtle">
              The JSON file restores everything. The CSV is for a spreadsheet and cannot be
              imported back.
            </p>
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Import</p>
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void onFileChosen(file);
              }}
            />
            <Button
              variant="outline"
              block
              disabled={preview.isPending}
              onClick={() => inputRef.current?.click()}
            >
              <Upload aria-hidden />
              {preview.isPending ? "Checking the file…" : "Choose a backup file"}
            </Button>
            <p className="text-xs text-ink-subtle">
              You will see what the file contains before anything is replaced.
            </p>
            {readError ? <InlineError message={readError} /> : null}
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
              Start over
            </p>
            <Button variant="danger" block onClick={() => setResetting(true)}>
              <Trash2 aria-hidden />
              Reset all data
            </Button>
            <p className="text-xs text-ink-subtle">
              Export a backup first — this cannot be undone.
            </p>
          </div>
        </CardContent>
      </Card>

      <Sheet
        open={pending !== null}
        onClose={() => setPending(null)}
        title="Replace everything with this backup?"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" block onClick={() => setPending(null)} disabled={apply.isPending}>
              Cancel
            </Button>
            <Button
              variant="danger"
              block
              onClick={() => void confirmImport()}
              disabled={apply.isPending}
            >
              {apply.isPending ? "Importing…" : "Replace my data"}
            </Button>
          </div>
        }
      >
        {pending ? (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">
              <span className="font-medium text-ink">{pending.fileName}</span> passed validation.
              Importing it removes everything currently in the app and puts this in its place.
            </p>

            <dl className="divide-y divide-border rounded-control border border-border">
              <SummaryRow label="Transactions" value={String(pending.summary.transactions)} />
              <SummaryRow label="Categories" value={String(pending.summary.categories)} />
              <SummaryRow label="Monthly budgets" value={String(pending.summary.monthlyBudgets)} />
              <SummaryRow
                label="Planned expenses"
                value={String(pending.summary.plannedExpenses)}
              />
              <SummaryRow label="Currency" value={pending.summary.currency} />
              <SummaryRow
                label="Covers"
                value={describeCoverage(pending.summary)}
              />
            </dl>

            {apply.error ? <InlineError message={apply.error.message} /> : null}
          </div>
        ) : null}
      </Sheet>

      <ConfirmDialog
        open={resetting}
        onClose={() => setResetting(false)}
        onConfirm={() => void confirmReset()}
        title="Delete everything?"
        tone="danger"
        confirmLabel="Delete it all"
        requirePhrase="DELETE"
        busy={reset.isPending}
        description={
          <div className="space-y-2">
            <p>
              Every transaction, budget, planned expense and category you have added will be
              deleted. The default categories will be restored so the app still works.
            </p>
            <p className="font-medium text-ink">
              There is no undo and no copy kept on the server.
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href={exportUrls.json} download>
                <Download aria-hidden />
                Export a backup first
              </a>
            </Button>
          </div>
        }
      />
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="tabular truncate font-medium text-ink">{value}</dd>
    </div>
  );
}

function describeCoverage(summary: ImportSummary): string {
  if (!summary.earliestTransaction || !summary.latestTransaction) {
    return summary.monthsCovered.length > 0
      ? summary.monthsCovered.map((month) => formatMonthLabel(`${month}-01`, "short")).join(", ")
      : "No transactions";
  }

  if (summary.earliestTransaction === summary.latestTransaction) {
    return formatDayLabel(summary.earliestTransaction);
  }

  return `${formatDayLabel(summary.earliestTransaction)} – ${formatDayLabel(summary.latestTransaction)}`;
}
