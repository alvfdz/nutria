import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { FieldError } from "@/components/status-line";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ICON_STROKE } from "@/lib/design-system";

/**
 * A labelled input for the auth screens, built on the design system's `Field`.
 * Below the input it shows the field's first validation message or, while the
 * field is valid, its helper line; whichever is showing is wired up through
 * `aria-describedby`. Password inputs get an eye button that toggles whether
 * the value is readable.
 *
 * @param props Standard input attributes, passed to the input.
 * @param props.id Id of the input; the label, helper and error derive from it.
 * @param props.label Visible label text.
 * @param props.description Muted helper line, such as a length requirement.
 * @param props.errors Validation messages for the field, if any.
 * @returns The field; never throws.
 */
export function AuthField({
  id,
  label,
  description,
  errors,
  ...inputProps
}: {
  id: string;
  label: string;
  description?: string;
  errors?: string[];
} & Omit<ComponentProps<"input">, "id">) {
  const [revealed, setRevealed] = useState(false);
  const invalid = Boolean(errors?.[0]);
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;
  const isPassword = inputProps.type === "password";

  const controlProps = {
    id,
    "aria-invalid": invalid ? true : undefined,
    "aria-describedby": invalid
      ? errorId
      : description
        ? descriptionId
        : undefined,
    ...inputProps,
  };

  return (
    <Field data-invalid={invalid ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {isPassword ? (
        <InputGroup>
          <InputGroupInput
            {...controlProps}
            type={revealed ? "text" : "password"}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
              aria-label={revealed ? "Hide password" : "Show password"}
              onClick={() => setRevealed((value) => !value)}
              className="text-muted-foreground"
            >
              {revealed ? (
                <EyeOff strokeWidth={ICON_STROKE} />
              ) : (
                <Eye strokeWidth={ICON_STROKE} />
              )}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      ) : (
        <Input {...controlProps} />
      )}
      {invalid ? (
        <FieldError id={errorId} errors={errors} />
      ) : description ? (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      ) : null}
    </Field>
  );
}
