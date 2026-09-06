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
import { Sheet } from "@/components/ui/sheet";
import { InlineError } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { usePlannedExpenseActions } from "@/hooks/use-planned-expenses";
import type { PlannedExpenseRecord } from "@/lib/data/types";
import { toDecimalString } from "@/lib/finance/money";
import type { DateKey } from "@/lib/finance/types";
import { currencySymbol } from "@/lib/utils/currency";
import { plannedExpenseFormSchema, type PlannedExpenseFormValues } from "@/lib/validations/budget";

/**
 * Add or amend a plan.
 *
 * A plan is not spending, so nothing here touches a balance. A category is
 * required even though the column allows null: without one, marking the plan as
 * spent later would have no category to give the resulting expense.
 */
export function PlannedExpenseFormSheet({
  open,
  onClose,
  plannedExpense = null,
  initialDate,
}: {
  open: boolean;
  onClose: () => void;
  plannedExpense?: PlannedExpenseRecord | null;
  initialDate?: DateKey;
}) {
  const { today, currency } = useAppData();
  const toast = useToast();
  const { create, update, remove } = usePlannedExpenseActions();
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const isEditing = plannedExpense !== null;

  const defaultValues = React.useMemo<PlannedExpenseFormValues>(
    () => ({
      amount: plannedExpense ? toDecimalString(plannedExpense.amount) : "",
      categoryId: plannedExpense?.categoryId ?? "",
      plannedDate: plannedExpense?.plannedDate ?? initialDate ?? today ?? "",
      description: plannedExpense?.description ?? "",
    }),
    [plannedExpense, initialDate, today],
  );

  const form = useForm<PlannedExpenseFormValues>({
    resolver: zodResolver(plannedExpenseFormSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (open) form.reset(defaultValues);
  }, [open, defaultValues, form]);

  // `useWatch` rather than `form.watch`, which returns a fresh function on
  // every render and opts the whole component out of compiler memoisation.
  const categoryId = useWatch({ control: form.control, name: "categoryId" });

  const errors = form.formState.errors;
  const pending = create.isPending || update.isPending;
  const submitError = create.error ?? update.error;

  const onSubmit = form.handleSubmit(async (values) => {
    if (!values.categoryId) {
      form.setError("categoryId", { type: "manual", message: "Choose a category." });
      return;
    }

    const payload = {
      amount: values.amount,
      categoryId: values.categoryId,
      plannedDate: values.plannedDate,
      description: values.description,
    };

    const result = isEditing
      ? await update.run(plannedExpense.id, payload)
      : await create.run(payload);

    if (!result.ok) {
      for (const [field, message] of Object.entries(result.error.fieldErrors ?? {})) {
        if (field in defaultValues) {
          form.setError(field as keyof PlannedExpenseFormValues, { type: "server", message });
        }
      }
      return;
    }

    toast.success(isEditing ? "Plan updated." : "Plan added.");
    onClose();
  });

  const onDelete = async () => {
    if (!plannedExpense) return;

    const result = await remove.run(plannedExpense.id);
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }

    setConfirmDelete(false);
    onClose();
    toast.success("Plan deleted.");
  };

  return (
    <>
      <Sheet
        open={open && !confirmDelete}
        onClose={onClose}
        title={isEditing ? "Edit plan" : "Plan an expense"}
        description="Plans reserve money against safe-to-spend. They do not change your balance."
        footer={
          <div className="flex gap-2">
            {isEditing ? (
              <Button
                variant="danger-outline"
                size="icon"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete plan"
                disabled={pending}
              >
                <Trash2 aria-hidden />
              </Button>
            ) : null}
            <Button variant="outline" block onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button block onClick={onSubmit} disabled={pending}>
              {pending ? "Saving…" : isEditing ? "Save changes" : "Add plan"}
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
          <Field error={errors.amount?.message}>
            <FieldLabel>Amount</FieldLabel>
            <AmountInput
              currencySymbol={currencySymbol(currency)}
              placeholder="0"
              autoFocus
              {...form.register("amount")}
            />
          </Field>

          <Field error={errors.categoryId?.message}>
            <FieldLabel>Category</FieldLabel>
            <CategorySelect
              value={categoryId}
              onChange={(next) => form.setValue("categoryId", next, { shouldValidate: false })}
            />
          </Field>

          <Field error={errors.plannedDate?.message}>
            <FieldLabel>Date</FieldLabel>
            <Input type="date" {...form.register("plannedDate")} />
            <FieldHint>Plans in the rest of this month reduce safe-to-spend.</FieldHint>
          </Field>

          <Field error={errors.description?.message}>
            <FieldLabel optional>What is it for?</FieldLabel>
            <Input placeholder="Cinema with friends" maxLength={280} {...form.register("description")} />
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
        title="Delete this plan?"
        description="Nothing financial changes — a plan has never affected your balance."
        confirmLabel="Delete"
        tone="danger"
        busy={remove.isPending}
      />
    </>
  );
}
