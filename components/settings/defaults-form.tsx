"use client";

import * as React from "react";

import { useAppData } from "@/components/providers/app-data-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AmountInput, Field, FieldHint, FieldLabel, Select } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { InlineError, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useSaveSettings } from "@/hooks/use-budget";
import { toDecimalString } from "@/lib/finance/money";
import { SUPPORTED_CURRENCIES, currencySymbol } from "@/lib/utils/currency";
import { nonNegativeAmountSchema } from "@/lib/validations/shared";
import type { AppSettingsView } from "@/types/app";

/**
 * Defaults for months that have no budget row of their own.
 *
 * Changing these does not touch a month that already has its own budget, and it
 * never touches a transaction. Months that fall back to the default are simply
 * re-derived the next time they are read.
 */
export function DefaultsForm() {
  const { settings } = useAppData();

  if (!settings) return <DefaultsFormSkeleton />;

  /*
   * Keyed on the saved values so the fields are seeded once, at mount, from
   * `useState` initialisers. When a save comes back the key changes and the
   * form mounts again with the stored figures — no effect writing over what the
   * user typed, and no window where the inputs disagree with the database.
   */
  return (
    <DefaultsFields
      key={`${settings.currency}:${settings.defaultMonthlyBudget}:${settings.defaultDailyAllowance ?? "derived"}`}
      settings={settings}
    />
  );
}

function DefaultsFields({ settings }: { settings: AppSettingsView }) {
  const toast = useToast();
  const saveSettings = useSaveSettings();

  const [budgetInput, setBudgetInput] = React.useState(() =>
    toDecimalString(settings.defaultMonthlyBudget),
  );
  const [allowanceInput, setAllowanceInput] = React.useState(() =>
    settings.defaultDailyAllowance === null
      ? ""
      : toDecimalString(settings.defaultDailyAllowance),
  );
  const [derive, setDerive] = React.useState(settings.defaultDailyAllowance === null);
  const [currencyCode, setCurrencyCode] = React.useState(settings.currency);

  const budgetValid = nonNegativeAmountSchema.safeParse(budgetInput).success;
  const allowanceValid = derive || nonNegativeAmountSchema.safeParse(allowanceInput).success;

  const save = async () => {
    const result = await saveSettings.run({
      currency: currencyCode,
      defaultMonthlyBudget: budgetInput,
      defaultDailyAllowance: derive ? null : allowanceInput,
    });

    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }

    toast.success("Defaults saved.");
  };

  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Defaults</CardTitle>
          <p className="mt-0.5 text-xs text-ink-muted">
            Used by any month without a budget of its own.
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Field error={!budgetValid && budgetInput !== "" ? "Enter a valid amount." : undefined}>
          <FieldLabel>Default monthly budget</FieldLabel>
          <AmountInput
            currencySymbol={currencySymbol(currencyCode)}
            value={budgetInput}
            onChange={(event) => setBudgetInput(event.target.value)}
          />
        </Field>

        <Switch
          checked={derive}
          onCheckedChange={setDerive}
          label="Derive the daily allowance"
          description="Budget divided by the number of days in each month."
        />

        {!derive ? (
          <Field
            error={!allowanceValid && allowanceInput !== "" ? "Enter a valid amount." : undefined}
          >
            <FieldLabel>Default daily allowance</FieldLabel>
            <AmountInput
              currencySymbol={currencySymbol(currencyCode)}
              value={allowanceInput}
              onChange={(event) => setAllowanceInput(event.target.value)}
            />
            <FieldHint>
              Applied to every month without its own allowance, whatever its length.
            </FieldHint>
          </Field>
        ) : null}

        <Field>
          <FieldLabel>Currency</FieldLabel>
          <Select value={currencyCode} onChange={(event) => setCurrencyCode(event.target.value)}>
            {SUPPORTED_CURRENCIES.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </Select>
          <FieldHint>Changes how amounts are displayed. Stored amounts are unchanged.</FieldHint>
        </Field>

        <Field>
          <FieldLabel>Month starts on</FieldLabel>
          <Select value="1" disabled>
            <option value="1">The 1st</option>
          </Select>
          <FieldHint>
            Months currently run from the 1st to the last calendar day. The database stores a start
            day so a salary-aligned month can be added later, but the calculation engine does not
            read it yet — offering the choice now would report balances for periods it does not
            actually use.
          </FieldHint>
        </Field>

        {saveSettings.error ? <InlineError message={saveSettings.error.message} /> : null}

        <Button
          block
          disabled={!budgetValid || !allowanceValid || saveSettings.isPending}
          onClick={() => void save()}
        >
          {saveSettings.isPending ? "Saving…" : "Save defaults"}
        </Button>
      </CardContent>
    </Card>
  );
}

function DefaultsFormSkeleton() {
  return (
    <Card className="space-y-3 p-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </Card>
  );
}
