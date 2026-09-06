"use client";

import { ChevronDown, ChevronUp, Pencil, Plus } from "lucide-react";
import * as React from "react";

import { useAppData } from "@/components/providers/app-data-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_ICON_NAMES, CategoryIcon } from "@/components/ui/category-icon";
import { Field, FieldHint, FieldLabel, Input, Select } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { InlineError } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useCategoryActions } from "@/hooks/use-categories";
import type { CategoryRecord } from "@/lib/data/types";

/**
 * Category management.
 *
 * Categories are retired, never deleted: a category referenced by even one
 * transaction cannot be removed without rewriting history, and the foreign key
 * would refuse anyway. Retiring hides it from the pickers while every
 * transaction already recorded against it keeps its label.
 *
 * Reordering uses explicit up and down controls rather than drag and drop. On a
 * phone, dragging inside a scrolling page is unreliable, and buttons are
 * reachable from a keyboard.
 */
export function CategoryManager() {
  const { categories } = useAppData();
  const toast = useToast();
  const { create, update, reorder } = useCategoryActions();

  const [editing, setEditing] = React.useState<CategoryRecord | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [showRetired, setShowRetired] = React.useState(false);

  const ordered = React.useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [categories],
  );

  const active = ordered.filter((category) => category.isActive);
  const retired = ordered.filter((category) => !category.isActive);

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= active.length) return;

    const next = [...active];
    [next[index], next[target]] = [next[target], next[index]];

    // The whole visible order is sent so the result cannot be ambiguous.
    const orderedIds = [...next, ...retired].map((category) => category.id);
    const result = await reorder.run(orderedIds);
    if (!result.ok) toast.error(result.error.message);
  };

  const setActive = async (category: CategoryRecord, isActive: boolean) => {
    const result = await update.run(category.id, { isActive });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.success(isActive ? `${category.name} restored.` : `${category.name} retired.`);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Categories</CardTitle>
            <p className="mt-0.5 text-xs text-ink-muted">
              Rename, reorder or retire. Nothing is ever deleted.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus aria-hidden />
            Add
          </Button>
        </CardHeader>

        <CardContent className="space-y-1">
          <ul className="divide-y divide-border">
            {active.map((category, index) => (
              <li key={category.id} className="flex items-center gap-2 py-2">
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-muted"
                >
                  <CategoryIcon name={category.icon} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">
                    {category.name}
                  </span>
                  {category.description ? (
                    <span className="block truncate text-xs text-ink-subtle">
                      {category.description}
                    </span>
                  ) : null}
                </span>

                <span className="flex shrink-0 items-center">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => void move(index, -1)}
                    disabled={index === 0 || reorder.isPending}
                    aria-label={`Move ${category.name} up`}
                  >
                    <ChevronUp aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => void move(index, 1)}
                    disabled={index === active.length - 1 || reorder.isPending}
                    aria-label={`Move ${category.name} down`}
                  >
                    <ChevronDown aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setEditing(category)}
                    aria-label={`Edit ${category.name}`}
                  >
                    <Pencil aria-hidden />
                  </Button>
                </span>
              </li>
            ))}
          </ul>

          {retired.length > 0 ? (
            <div className="border-t border-border pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="px-0"
                aria-expanded={showRetired}
                onClick={() => setShowRetired((current) => !current)}
              >
                {showRetired ? "Hide" : "Show"} {retired.length} retired
              </Button>

              {showRetired ? (
                <ul className="divide-y divide-border">
                  {retired.map((category) => (
                    <li key={category.id} className="flex items-center gap-2 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink-muted">
                          {category.name}
                        </span>
                      </span>
                      <Badge>Retired</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void setActive(category, true)}
                        disabled={update.isPending}
                      >
                        Restore
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {reorder.error ? <InlineError message={reorder.error.message} /> : null}
        </CardContent>
      </Card>

      <CategoryFormSheet
        open={adding}
        onClose={() => setAdding(false)}
        onSubmit={async (values) => {
          const result = await create.run(values);
          if (!result.ok) return result.error.message;
          toast.success(`${values.name} added.`);
          return null;
        }}
        pending={create.isPending}
      />

      <CategoryFormSheet
        open={editing !== null}
        category={editing}
        onClose={() => setEditing(null)}
        onSubmit={async (values) => {
          if (!editing) return null;
          const result = await update.run(editing.id, values);
          if (!result.ok) return result.error.message;
          toast.success("Category updated.");
          return null;
        }}
        onToggleActive={
          editing
            ? async (isActive) => {
                await setActive(editing, isActive);
              }
            : undefined
        }
        pending={update.isPending}
      />
    </>
  );
}

interface CategoryFormValues {
  name: string;
  icon: string | null;
  description: string | null;
}

function CategoryFormSheet({
  open,
  onClose,
  category = null,
  onSubmit,
  onToggleActive,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  category?: CategoryRecord | null;
  /** Resolves to an error message, or `null` when the save succeeded. */
  onSubmit: (values: CategoryFormValues) => Promise<string | null>;
  onToggleActive?: (isActive: boolean) => Promise<void>;
  pending: boolean;
}) {
  const [name, setName] = React.useState("");
  const [icon, setIcon] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setIcon(category?.icon ?? "");
    setDescription(category?.description ?? "");
    setError(null);
  }, [open, category]);

  const submit = async () => {
    if (name.trim() === "") {
      setError("Give the category a name.");
      return;
    }

    const message = await onSubmit({
      name: name.trim(),
      icon: icon || null,
      description: description.trim() || null,
    });

    if (message) {
      setError(message);
      return;
    }

    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={category ? `Edit ${category.name}` : "Add a category"}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" block onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button block onClick={() => void submit()} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field error={error ?? undefined}>
          <FieldLabel>Name</FieldLabel>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={48}
            autoFocus
          />
        </Field>

        <Field>
          <FieldLabel optional>Icon</FieldLabel>
          <Select value={icon} onChange={(event) => setIcon(event.target.value)}>
            <option value="">No icon</option>
            {CATEGORY_ICON_NAMES.map((option) => (
              <option key={option} value={option}>
                {option.replace(/-/g, " ")}
              </option>
            ))}
          </Select>
        </Field>

        <Field>
          <FieldLabel optional>Description</FieldLabel>
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={140}
          />
        </Field>

        {category && onToggleActive ? (
          <div className="border-t border-border pt-4">
            <Switch
              checked={category.isActive}
              onCheckedChange={(next) => void onToggleActive(next)}
              label="Available for new expenses"
              description="Retiring keeps every past transaction and its category intact."
            />
            <FieldHint className="mt-2">
              Categories are never deleted, so your history can never lose its labels.
            </FieldHint>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
