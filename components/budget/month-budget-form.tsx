"use client";

import * as React from "react";

import { useAppData } from "@/components/providers/app-data-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AmountInput, Field, FieldHint, FieldLabel } from "@/components/ui/field";
import { Amount } from "@/components/ui/money";
import { Switch } from "@/components/ui/switch";
import { InlineError, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useSaveBudget } from "@/hooks/use-budget";
import { resolveMonthAllowance } from "@/lib/finance/calculations";
import { toDecimalString, type Money } from "@/lib/finance/money";
import type { MonthKey, MonthlyBudgetConfig } from "@/lib/finance/types";
import { currencySymbol } from "@/lib/utils/currency";
import { formatMonthLabel } from "@/lib/utils/formatting";
import { nonNegativeAmountSchema } from "@/lib/validations/shared";
import type { AppSettingsView } from "@/types/app";

/**
 * The budget for one month.
 *
 * The preview under the fields is produced by the same `resolveMonthAllowance`
 * the ledger uses, so what the user is told they are about to save is exactly
 * what the engine will do with it — including the gap an explicit override
 * opens against the monthly budget.
 *
 * Saving changes configuration only. No transaction is rewritten; the affected
 * month is simply re-derived, which is why editing a month that has already
 * happened asks for confirmation first.
 */
export function MonthBudgetForm({
  month,
  existing,
}: {
  month: MonthKey;
  /** The month's own row, or `undefined` when it falls back to the defaults. */
  existing: MonthlyBudgetConfig | undefined;
}) {
  const { settings } = useAppData();

  if (!settings) return <MonthBudgetFormSkeleton />;

  /*
   * Keyed on the month and its saved figures so the fields seed once, at mount,
   * from `useState` initialisers. Switching month or saving changes the key and
   * mounts the form again against the stored values, which is both simpler than
   * an effect writing state back and free of the render where the inputs still
   * show the previous month.
   */
  return (
    <MonthBudgetFields
      key={`${month}:${existing?.monthlyBudget ?? "default"}:${existing?.dailyAllowance ?? "derived"}`}
      month={month}
      existing={existing}
      settings={settings}
    />
  );
}

function MonthBudgetFields({
  month,
  existing,
  settings,
}: {
  month: MonthKey;
  existing: MonthlyBudgetConfig | undefined;
  settings: AppSettingsView;
}) {
  const { today } = useAppData();
  const currency = settings.currency;
  const toast = useToast();
  const saveBudget = useSaveBudget();

  const seededAllowance = existing ? existing.dailyAllowance : settings.defaultDailyAllowance;

  const [budgetInput, setBudgetInput] = React.useState(() =>
    toDecimalString(existing?.monthlyBudget ?? settings.defaultMonthlyBudget),
  );
  const [allowanceInput, setAllowanceInput] = React.useState(() =>
    seededAllowance === null ? "" : toDecimalString(seededAllowance),
  );
  const [derive, setDerive] = React.useState(seededAllowance === null);
  const [confirming, setConfirming] = React.useState(false);

  const parsedBudget = parseAmount(budgetInput);
  const parsedAllowance = derive ? null : parseAmount(allowanceInput);

  const preview =
    parsedBudget !== null
      ? resolveMonthAllowance(
          month,
          { monthStart: month, monthlyBudget: parsedBudget, dailyAllowance: parsedAllowance },
          {
            currency: settings.currency,
            defaultMonthlyBudget: settings.defaultMonthlyBudget,
            defaultDailyAllowance: settings.defaultDailyAllowance,
            monthStartDay: settings.monthStartDay,
          },
        )
      : null;

  const isPast = today !== null && month < today.slice(0, 7) + "-01";
  const invalid = parsedBudget === null || (!derive && parsedAllowance === null);

  const save = async () => {
    if (invalid) return;

    const result = await saveBudget.run({
      monthStart: month,
      monthlyBudget: budgetInput,
      dailyAllowance: derive ? null : allowanceInput,
    });

    setConfirming(false);

    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }

    toast.success(`Budget saved for ${formatMonthLabel(month)}.`);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>{formatMonthLabel(month)} budget</CardTitle>
            <p className="mt-0.5 text-xs text-ink-muted">
              {existing
                ? "This month has its own budget."
                : "This month is using your default budget."}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Field error={parsedBudget === null && budgetInput !== "" ? "Enter a valid amount." : undefined}>
            <FieldLabel>Monthly budget</FieldLabel>
            <AmountInput
              currencySymbol={currencySymbol(currency)}
              value={budgetInput}
              onChange={(event) => setBudgetInput(event.target.value)}
            />
          </Field>

          <Switch
            checked={derive}
            onCheckedChange={setDerive}
            label="Work out the daily allowance for me"
            description="Divides the budget by the number of days in the month."
          />

          {!derive ? (
            <Field
              error={
                parsedAllowance === null && allowanceInput !== ""
                  ? "Enter a valid amount."
                  : undefined
              }
            >
              <FieldLabel>Daily allowance</FieldLabel>
              <AmountInput
                currencySymbol={currencySymbol(currency)}
                value={allowanceInput}
                onChange={(event) => setAllowanceInput(event.target.value)}
              />
              <FieldHint>Used exactly as entered, even if it does not match the budget.</FieldHint>
            </Field>
          ) : null}

          {preview ? (
            <dl className="space-y-1.5 rounded-control bg-surface-muted px-3 py-2.5 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-muted">Daily allowance</dt>
                <dd className="tabular font-semibold text-ink">
                  <Amount value={preview.perDay} currency={currency} withDecimals />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-muted">Accrues over {preview.daysInMonth} days</dt>
                <dd className="tabular font-semibold text-ink">
                  <Amount value={preview.allocatedTotal} currency={currency} />
                </dd>
              </div>
              {preview.variance !== 0 ? (
                <p className="pt-1 text-xs text-warning">
                  That is{" "}
                  <Amount value={preview.variance} currency={currency} signed /> against the monthly
                  budget. Balances follow the allowance, so the difference is real — it is shown
                  rather than hidden.
                </p>
              ) : null}
            </dl>
          ) : null}

          {saveBudget.error ? <InlineError message={saveBudget.error.message} /> : null}

          <Button
            block
            disabled={invalid || saveBudget.isPending}
            onClick={() => (isPast ? setConfirming(true) : void save())}
          >
            {saveBudget.isPending ? "Saving…" : "Save budget"}
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => void save()}
        title={`Change the ${formatMonthLabel(month)} budget?`}
        description={
          <div className="space-y-2">
            <p>
              {formatMonthLabel(month)} has already happened. Changing its budget re-derives every
              balance from the first of that month onward, including what carried into the months
              after it.
            </p>
            <p>None of your transactions are altered — only the allowance they were measured against.</p>
          </div>
        }
        confirmLabel="Change it"
        busy={saveBudget.isPending}
      />
    </>
  );
}

function MonthBudgetFormSkeleton() {
  return (
    <Card className="space-y-3 p-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-20 w-full" />
    </Card>
  );
}

/** `null` when the text is not a usable amount, so the preview can stay quiet. */
function parseAmount(input: string): Money | null {
  if (input.trim() === "") return null;
  const parsed = nonNegativeAmountSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}
