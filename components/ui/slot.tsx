import * as React from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Render props onto a single child element instead of a wrapper.
 *
 * Lets `<Button asChild><Link/></Button>` produce one `<a>` carrying the button
 * styling, rather than an anchor nested in a button — which is both invalid
 * markup and confusing for screen readers.
 */
export function Slot({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  if (!React.isValidElement(children)) return null;

  const child = children as React.ReactElement<Record<string, unknown>>;
  const childProps = child.props;

  return React.cloneElement(child, {
    ...props,
    ...childProps,
    className: cn(className, childProps.className as string | undefined),
  });
}
