import type { ReactNode } from "react";

import { Check, CircleAlert } from "lucide-react";
import { cn } from "cn";

/**
 * One sentence of inline feedback: a brand tick for a valid state, or a
 * destructive alert icon and text for one that needs fixing. The sentence
 * carries the meaning, so the state is never conveyed by colour alone.
 *
 * @param props.valid Whether the state is good; false renders the alert style.
 * @param props.id Element id, for wiring through `aria-describedby`.
 * @param props.children The sentence to show.
 * @returns The status line; never throws.
 */
export function StatusLine({
  valid,
  id,
  children,
}: {
  valid: boolean;
  id?: string;
  children: ReactNode;
}) {
  const Icon = valid ? Check : CircleAlert;

  return (
    <p
      id={id}
      data-slot="status-line"
      data-valid={valid}
      className={cn(
        "type-caption flex items-start gap-1.5",
        valid ? "text-muted-foreground" : "text-destructive",
      )}
    >
      <Icon
        aria-hidden="true"
        strokeWidth={1.8}
        className={cn(
          "mt-0.5 size-4 shrink-0",
          valid ? "text-brand" : "text-destructive",
        )}
      />
      <span className="min-w-0 wrap-anywhere">{children}</span>
    </p>
  );
}
