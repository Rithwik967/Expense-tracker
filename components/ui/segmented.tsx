"use client";

import * as React from "react";

import { cn } from "@/lib/utils/cn";

export interface SegmentedOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

/**
 * A small set of mutually exclusive choices.
 *
 * Built as a radiogroup with roving arrow-key focus, so it behaves the way a
 * keyboard user expects rather than requiring a Tab stop per option.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const move = (from: number, delta: number) => {
    const next = (from + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex w-full rounded-control bg-surface-muted p-1",
        className,
      )}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                move(index, 1);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                move(index, -1);
              }
            }}
            className={cn(
              "flex-1 rounded-[calc(var(--radius-control)-2px)] px-3 font-medium transition-colors",
              size === "sm" ? "h-8 text-xs" : "h-10 text-sm",
              selected
                ? "bg-surface text-ink shadow-card"
                : "text-ink-muted hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
