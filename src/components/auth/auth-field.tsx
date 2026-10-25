import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * A labelled input for the auth screens, with its first validation message
 * rendered underneath and wired up through `aria-describedby`.
 *
 * @param props.id Id of the input; the label and error derive from it.
 * @param props.label Visible label text.
 * @param props.errors Validation messages for the field, if any.
 */
export function AuthField({
  id,
  label,
  errors,
  ...inputProps
}: {
  id: string;
  label: string;
  errors?: string[];
} & Omit<ComponentProps<"input">, "id">) {
  const message = errors?.[0];
  const errorId = `${id}-error`;

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? errorId : undefined}
        {...inputProps}
      />
      {message ? (
        <p id={errorId} className="text-destructive text-xs">
          {message}
        </p>
      ) : null}
    </div>
  );
}
