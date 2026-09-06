"use client";

import { useAppData } from "@/components/providers/app-data-provider";
import { Select } from "@/components/ui/field";

/**
 * Category picker.
 *
 * Only active categories are offered, but a retired category that is already on
 * the transaction being edited stays in the list — otherwise opening an old
 * expense would silently blank its category and saving would move the spending
 * somewhere it never was.
 */
export function CategorySelect({
  value,
  onChange,
  includeEmptyOption = true,
  emptyLabel = "Choose a category",
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  includeEmptyOption?: boolean;
  emptyLabel?: string;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange">) {
  const { activeCategories, categories } = useAppData();

  const selectedInactive =
    value && !activeCategories.some((category) => category.id === value)
      ? categories.find((category) => category.id === value)
      : undefined;

  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)} {...props}>
      {includeEmptyOption ? <option value="">{emptyLabel}</option> : null}
      {activeCategories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
      {selectedInactive ? (
        <option value={selectedInactive.id}>{selectedInactive.name} (retired)</option>
      ) : null}
    </Select>
  );
}
