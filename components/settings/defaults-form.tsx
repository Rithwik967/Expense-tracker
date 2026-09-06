"use client";

import * as React from "react";

import { useAppData } from "@/components/providers/app-data-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AmountInput, Field, FieldHint, FieldLabel, Select } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { InlineError } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useSaveSettings } from "@/hooks/use-budget";
import { toDecimalString } from "@/lib/finance/money";
import { SUPPORTED_CURRENCIES, currencySymbol } from "@/lib/utils/currency";
import { nonNegativeAmountSchema } from "@/lib/validations/shared";

/**
 * Defaults for months that have no budget row of their own.
 *
 * Changing these does not touch a month that already has its own budget, and it
 * never touches a transaction. Months that fall back to the default are simply
 * re-derived the next time they are read.
 */
export function DefaultsForm() {
  const { settings, currency } = useAppData();
  const toast = useToast();
  const saveSettings = useSaveSettings();

  const [budgetInput, setBudgetInput] = React.useState("");
  const [allowanceInput, setAllowanceInput] = React.useState("");
  const [derive, setDerive] = React.useState(true);
  const [currencyCode, setCurrencyCode] = React.useState(currency);

  const seedKey = settings
    ? `${settings.currency}:${settings.defaultMonthlyBudget}:${settings.defaultDailyAllowance ?? "derived"}`
    : "loading";

  React.useEffect(() => {
    if (!settings) return;
    setBudgetInput(toDecimalString(settings.defaultMonthlyBudget));
    setAllowanceInput(
      settings.defaultDailyAllowance === null
        ? ""
        : toDecimalString(settings.defaultDailyAllowance),
    );
    setDerive(settings.defaultDailyAllowance === null);
    setCurrencyCode(settings.currency);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed re-seed
  }, [seedKey]);

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
