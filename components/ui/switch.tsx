"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";

/** An on/off control. A real `role="switch"` button, so it announces its state. */
export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  id,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}) {
  const generatedId = React.useId();
  const switchId = id ?? generatedId;
  const descriptionId = `${switchId}-description`;

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={switchId} className="block text-sm font-medium text-ink">
          {label}
        </label>
        {description ? (
          <p id={descriptionId} className="mt-0.5 text-xs text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-brand" : "bg-border-strong",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "inline-block size-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}
