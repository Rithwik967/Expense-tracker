"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { useForm, useWatch } from "react-hook-form";

import { useAppData } from "@/components/providers/app-data-provider";
import { CategorySelect } from "@/components/transactions/category-select";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AmountInput, Field, FieldHint, FieldLabel, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { InlineError } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useTransactionActions } from "@/hooks/use-transactions";
import type { TransactionRecord } from "@/lib/data/types";
import { toDecimalString } from "@/lib/finance/money";
import type { DateKey, TransactionType } from "@/lib/finance/types";
import { currencySymbol } from "@/lib/utils/currency";
import { formatRelativeDayLabel } from "@/lib/utils/formatting";
import {
  toTransactionPayload,
  transactionFormSchema,
  type TransactionFormValues,
} from "@/lib/validations/transaction";

/**
 * Record or amend one transaction.
 *
 * A single sheet covers expenses, money coming in and adjustments because they
 * differ by one or two fields, not by workflow. Validation runs against the
 * same Zod rules the route handler uses, and anything the browser could not
 * know — a category retired in another tab — comes back as a field error and
 * lands on the input it belongs to.
 *
 * Any date is accepted, past or future. A past date re-derives every balance
 * from that day forward; a future one is held until the day arrives and is
 * deliberately left out of today's figures.
 */

const TYPE_OPTIONS = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Money in" },
  { value: "adjustment", label: "Adjust" },
] as const satisfies readonly { value: TransactionType; label: string }[];

const DIRECTION_OPTIONS = [
  { value: "credit", label: "Adds money" },
  { value: "debit", label: "Takes money" },
] as const;

export interface TransactionFormSheetProps {
  open: boolean;
  onClose: () => void;
  /** The row being edited, or `null`/omitted to record a new one. */
  transaction?: TransactionRecord | null;
  initialType?: TransactionType;
  initialDate?: DateKey;
}

export function TransactionFormSheet({
  open,
  onClose,
  transaction = null,
  initialType = "expense",
  initialDate,
}: TransactionFormSheetProps) {
  const { today, currency } = useAppData();
  const toast = useToast();
  const { create, update, remove, restore } = useTransactionActions();
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const isEditing = transaction !== null;
  const fallbackDate = initialDate ?? today ?? ("" as DateKey);

  const defaultValues = React.useMemo<TransactionFormValues>(
    () => ({
      type: transaction?.type ?? initialType,
      amount: transaction ? toDecimalString(transaction.amount) : "",
      categoryId: transaction?.categoryId ?? "",
      adjustmentDirection: transaction?.adjustmentDirection ?? "",
      date: transaction?.date ?? fallbackDate,
      description: transaction?.description ?? "",
    }),
    [transaction, initialType, fallbackDate],
  );

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues,
    mode: "onSubmit",
  });

  // Reopening the sheet for a different row must not show the previous one.
  React.useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, defaultValues, form]);

  // `useWatch` rather than `form.watch`, which returns a fresh function on
  // every render and opts the whole component out of compiler memoisation.
  const type = useWatch({ control: form.control, name: "type" });
  const errors = form.formState.errors;
  const pending = create.isPending || update.isPending;
  const submitError = create.error ?? update.error;

  const applyServerErrors = (fieldErrors: Record<string, string>) => {
    for (const [field, message] of Object.entries(fieldErrors)) {
      if (field in defaultValues) {
        form.setError(field as keyof TransactionFormValues, { type: "server", message });
      }
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = toTransactionPayload(values);

    const result = isEditing
      ? await update.run(transaction.id, payload)
      : await create.run(payload);

    if (!result.ok) {
      applyServerErrors(result.error.fieldErrors ?? {});
      return;
    }

    toast.success(isEditing ? "Transaction updated." : "Transaction saved.");
    onClose();
  });

  const onDelete = async () => {
    if (!transaction) return;

    const result = await remove.run(transaction.id);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }

    const deleted = result.data.deleted;
    setConfirmDelete(false);
    onClose();
    toast.show({
      message: "Transaction deleted.",
      tone: "success",
      action: {
        label: "Undo",
        onClick: () => {
          void restore.run(deleted).then((restored) => {
            if (restored.ok) toast.success("Transaction restored.");
            else toast.error(restored.error.message);
          });
        },
      },
    });
  };

  const dateValue = useWatch({ control: form.control, name: "date" });
  const adjustmentDirection = useWatch({ control: form.control, name: "adjustmentDirection" });
  const categoryId = useWatch({ control: form.control, name: "categoryId" });

  // An adjustment always has a direction; leaving the control unset would show
  // "Adds money" as selected while the value was still empty.
  React.useEffect(() => {
    if (type === "adjustment" && !form.getValues("adjustmentDirection")) {
      form.setValue("adjustmentDirection", "credit");
    }
  }, [type, form]);

  return (
    <>
      {/* Only one sheet is mounted at a time: two overlapping focus traps
          fight over Tab and Escape. */}
      <Sheet
        open={open && !confirmDelete}
        onClose={onClose}
        title={isEditing ? "Edit transaction" : "Add transaction"}
        description={
          isEditing
            ? "Changing the amount or date re-derives every balance from that day onward."
            : undefined
        }
        footer={
          <div className="flex gap-2">
            {isEditing ? (
              <Button
                variant="danger-outline"
                size="icon"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete transaction"
                disabled={pending}
              >
                <Trash2 aria-hidden />
              </Button>
            ) : null}
            <Button variant="outline" block onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button block onClick={onSubmit} disabled={pending}>
              {pending ? "Saving…" : isEditing ? "Save changes" : "Save"}
            </Button>
          </div>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit();
          }}
          noValidate
        >
          <Segmented
            label="Transaction type"
            options={TYPE_OPTIONS}
            value={type}
            onChange={(next) => form.setValue("type", next, { shouldValidate: false })}
          />

          <Field error={errors.amount?.message}>
            <FieldLabel>Amount</FieldLabel>
            <AmountInput
              currencySymbol={currencySymbol(currency)}
              placeholder="0"
              autoFocus
              {...form.register("amount")}
            />
          </Field>

          {type === "adjustment" ? (
            <Field error={errors.adjustmentDirection?.message}>
              <FieldLabel>Direction</FieldLabel>
              <Segmented
                label="Adjustment direction"
                options={DIRECTION_OPTIONS}
                value={adjustmentDirection || "credit"}
                onChange={(next) =>
                  form.setValue("adjustmentDirection", next, { shouldValidate: false })
                }
              />
              <FieldHint>
                Use an adjustment to correct a balance without recording real spending.
              </FieldHint>
            </Field>
          ) : null}

          {type === "expense" ? (
            <Field error={errors.categoryId?.message}>
              <FieldLabel>Category</FieldLabel>
              <CategorySelect
                value={categoryId}
                onChange={(next) => form.setValue("categoryId", next, { shouldValidate: false })}
              />
            </Field>
          ) : null}

          <Field error={errors.date?.message}>
            <FieldLabel>Date</FieldLabel>
            <Input type="date" {...form.register("date")} />
            {dateValue && today ? (
              <FieldHint>
                {formatRelativeDayLabel(dateValue as DateKey, today)}
                {dateValue > today ? " — held until that day arrives." : ""}
              </FieldHint>
            ) : null}
          </Field>

          <Field error={errors.description?.message}>
            <FieldLabel optional>Note</FieldLabel>
            <Input
              placeholder={type === "expense" ? "Chicken from the market" : "What was this for?"}
              maxLength={280}
              {...form.register("description")}
            />
          </Field>

          {submitError && Object.keys(submitError.fieldErrors ?? {}).length === 0 ? (
            <InlineError message={submitError.message} />
          ) : null}
        </form>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void onDelete()}
        title="Delete this transaction?"
        description="Every balance from that day onward will be recalculated. You can undo this straight after."
        confirmLabel="Delete"
        tone="danger"
        busy={remove.isPending}
      />
    </>
  );
}
