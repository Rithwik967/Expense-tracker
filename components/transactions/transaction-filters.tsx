"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import * as React from "react";

import { CategorySelect } from "@/components/transactions/category-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input, Select } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import type { TransactionSort } from "@/hooks/use-transactions";
import type { DateKey, TransactionType } from "@/lib/finance/types";

/**
 * Search and filtering for the history screen.
 *
 * Every control here narrows the *server* query rather than a list already in
 * the browser, so the screen never depends on having downloaded a year of
 * transactions. The advanced controls are collapsed by default: on a phone,
 * four always-visible filters would push the actual transactions off screen.
 */

export interface TransactionFiltersValue {
  readonly search: string;
  readonly type: TransactionType | "all";
  readonly categoryId: string;
  readonly from: string;
  readonly to: string;
  readonly sort: TransactionSort;
}

export const EMPTY_FILTERS: TransactionFiltersValue = {
  search: "",
  type: "all",
  categoryId: "",
  from: "",
  to: "",
  sort: "date-desc",
};

const TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "expense", label: "Spent" },
  { value: "income", label: "In" },
  { value: "adjustment", label: "Adjust" },
] as const;

const SORT_OPTIONS: readonly { value: TransactionSort; label: string }[] = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "amount-desc", label: "Largest amount" },
  { value: "amount-asc", label: "Smallest amount" },
];

export function countActiveFilters(value: TransactionFiltersValue): number {
  let count = 0;
  if (value.search.trim()) count += 1;
  if (value.type !== "all") count += 1;
  if (value.categoryId) count += 1;
  if (value.from) count += 1;
  if (value.to) count += 1;
  if (value.sort !== "date-desc") count += 1;
  return count;
}

export function TransactionFilters({
  value,
  onChange,
  monthRange,
}: {
  value: TransactionFiltersValue;
  onChange: (next: TransactionFiltersValue) => void;
  /** The selected month, offered as a one-tap date range. */
  monthRange?: { from: DateKey; to: DateKey; label: string };
}) {
  const [expanded, setExpanded] = React.useState(false);
  const activeCount = countActiveFilters(value);

  const patch = (changes: Partial<TransactionFiltersValue>) => onChange({ ...value, ...changes });
  const monthApplied =
    monthRange !== undefined && value.from === monthRange.from && value.to === monthRange.to;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
          />
          <input
            type="search"
            value={value.search}
            onChange={(event) => patch({ search: event.target.value })}
            placeholder="Search notes and categories"
            aria-label="Search transactions"
            className="h-11 w-full rounded-control border border-border bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-subtle focus:outline-2 focus:outline-brand"
          />
        </div>

        <Button
          variant={expanded ? "secondary" : "outline"}
          size="icon"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          aria-label={expanded ? "Hide filters" : "Show filters"}
          className="relative shrink-0"
        >
          <SlidersHorizontal aria-hidden />
          {activeCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-white">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </div>

      <Segmented
        label="Transaction type"
        size="sm"
        options={TYPE_OPTIONS}
        value={value.type}
        onChange={(next) => patch({ type: next })}
      />

      {expanded ? (
        <div className="space-y-3 rounded-card border border-border bg-surface p-3">
          <Field>
            <FieldLabel>Category</FieldLabel>
            <CategorySelect
              value={value.categoryId}
              onChange={(next) => patch({ categoryId: next })}
              emptyLabel="All categories"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>From</FieldLabel>
              <Input
                type="date"
                value={value.from}
                onChange={(event) => patch({ from: event.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel>To</FieldLabel>
              <Input
                type="date"
                value={value.to}
                onChange={(event) => patch({ to: event.target.value })}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel>Sort by</FieldLabel>
            <Select
              value={value.sort}
              onChange={(event) => patch({ sort: event.target.value as TransactionSort })}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex flex-wrap gap-2">
            {monthRange ? (
              <Button
                variant={monthApplied ? "secondary" : "outline"}
                size="sm"
                onClick={() =>
                  patch(
                    monthApplied
                      ? { from: "", to: "" }
                      : { from: monthRange.from, to: monthRange.to },
                  )
                }
              >
                {monthApplied ? `Clear ${monthRange.label}` : monthRange.label}
              </Button>
            ) : null}

            {activeCount > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTERS)}>
                <X aria-hidden />
                Reset filters
              </Button>
            ) : null}
          </div>
        </div>
      ) : activeCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="brand">
            {activeCount} filter{activeCount === 1 ? "" : "s"} applied
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTERS)}>
            Reset
          </Button>
        </div>
      ) : null}
    </div>
  );
}
