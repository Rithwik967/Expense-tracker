"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Form field primitives.
 *
 * The label, the hint and the error are wired to the control with `htmlFor` and
 * `aria-describedby`, and an invalid control carries `aria-invalid`. That means
 * a screen reader announces the same context a sighted user gets from the
 * layout, instead of just "edit text".
 */

interface FieldContextValue {
  id: string;
  descriptionId: string;
  errorId: string;
  hasError: boolean;
}

const FieldContext = React.createContext<FieldContextValue | null>(null);

function useFieldContext(): FieldContextValue | null {
  return React.useContext(FieldContext);
}

export function Field({
  children,
  error,
  className,
}: {
  children: React.ReactNode;
  error?: string;
  className?: string;
}) {
  const id = React.useId();
  const value = React.useMemo(
    () => ({
      id,
      descriptionId: `${id}-description`,
      errorId: `${id}-error`,
      hasError: Boolean(error),
    }),
    [id, error],
  );

  return (
    <FieldContext.Provider value={value}>
      <div className={cn("space-y-1.5", className)}>
        {children}
        {error ? (
          <p id={value.errorId} role="alert" className="text-xs font-medium text-negative">
            {error}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

export function FieldLabel({
  className,
  children,
  optional,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { optional?: boolean }) {
  const field = useFieldContext();
  return (
    <label
      htmlFor={field?.id}
      className={cn("flex items-center gap-1.5 text-sm font-medium text-ink", className)}
      {...props}
    >
      {children}
      {optional ? <span className="text-xs font-normal text-ink-subtle">Optional</span> : null}
    </label>
  );
}

export function FieldHint({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const field = useFieldContext();
  return <p id={field?.descriptionId} className={cn("text-xs text-ink-muted", className)} {...props} />;
}

const controlClasses =
  "w-full rounded-control border bg-surface px-3 text-base text-ink " +
  "placeholder:text-ink-subtle transition-colors " +
  "focus:outline-2 focus:outline-offset-0 focus:outline-brand " +
  "disabled:cursor-not-allowed disabled:opacity-60";

function describedBy(field: FieldContextValue | null): string | undefined {
  if (!field) return undefined;
  return field.hasError ? `${field.descriptionId} ${field.errorId}` : field.descriptionId;
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const field = useFieldContext();
  return (
    <input
      id={field?.id}
      aria-invalid={field?.hasError || undefined}
      aria-describedby={describedBy(field)}
      className={cn(
        controlClasses,
        "h-12",
        field?.hasError ? "border-negative" : "border-border",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const field = useFieldContext();
  return (
    <textarea
      id={field?.id}
      aria-invalid={field?.hasError || undefined}
      aria-describedby={describedBy(field)}
      className={cn(
        controlClasses,
        "min-h-[5rem] py-2.5",
        field?.hasError ? "border-negative" : "border-border",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const field = useFieldContext();
  return (
    <select
      id={field?.id}
      aria-invalid={field?.hasError || undefined}
      aria-describedby={describedBy(field)}
      className={cn(
        controlClasses,
        "h-12 appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-9",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22 stroke-width=%222%22 stroke=%22%236b7280%22%3E%3Cpath stroke-linecap=%22round%22 stroke-linejoin=%22round%22 d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E')]",
        field?.hasError ? "border-negative" : "border-border",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Amount entry.
 *
 * `inputMode="decimal"` brings up the numeric keypad on a phone, and the type
 * stays `text` so a comma or a stray space is corrected by validation rather
 * than silently discarded by the browser.
 */
export function AmountInput({
  className,
  currencySymbol = "₹",
  layout = "default",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  currencySymbol?: string;
  layout?: "default" | "hero";
}) {
  const field = useFieldContext();
  if (layout === "hero") {
    return (
      <div className="flex items-center justify-center gap-1">
        <span aria-hidden className="text-4xl font-bold text-ink/80">
          {currencySymbol}
        </span>
        <input
          id={field?.id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={field?.hasError || undefined}
          aria-describedby={describedBy(field)}
          className={cn(
            "tabular w-full max-w-xs bg-transparent p-0 text-center text-4xl font-bold text-ink outline-none placeholder:text-ink-subtle",
            className,
          )}
          {...props}
        />
      </div>
    );
  }
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl font-semibold text-ink-muted"
      >
        {currencySymbol}
      </span>
      <input
        id={field?.id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-invalid={field?.hasError || undefined}
        aria-describedby={describedBy(field)}
        className={cn(
          controlClasses,
          "tabular h-16 pl-9 text-3xl font-semibold",
          field?.hasError ? "border-negative" : "border-border",
          className,
        )}
        {...props}
      />
    </div>
  );
}
