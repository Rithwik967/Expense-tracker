import { Slot } from "@/components/ui/slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Every size keeps a minimum 44px touch target, which is the smallest reliably
 * tappable area on a phone. `icon-sm` is the one exception and is only used
 * inside a row that is itself tappable.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors " +
    "disabled:pointer-events-none disabled:opacity-50 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand " +
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand text-ink-inverse hover:bg-brand-strong active:bg-brand-strong shadow-sm",
        secondary: "bg-surface-muted text-ink hover:bg-border active:bg-border",
        outline: "border border-border bg-surface text-ink hover:bg-surface-muted",
        ghost: "text-ink-muted hover:bg-surface-muted hover:text-ink",
        danger: "bg-negative text-white hover:opacity-90 active:opacity-80",
        "danger-outline": "border border-negative/40 text-negative hover:bg-negative-soft",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-11 px-3 text-sm [&_svg]:size-4",
        md: "h-11 px-4 text-sm [&_svg]:size-4",
        lg: "h-12 px-5 text-base [&_svg]:size-5",
        icon: "size-11 [&_svg]:size-5",
        "icon-sm": "size-8 rounded-lg [&_svg]:size-4",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, block }), className);

  if (asChild) {
    return <Slot className={classes} {...props} />;
  }

  return (
    <button
      // Buttons inside forms default to submit, which has caused more than one
      // accidental save. Be explicit unless the caller says otherwise.
      type={type ?? "button"}
      className={classes}
      {...props}
    />
  );
}

export { buttonVariants };
