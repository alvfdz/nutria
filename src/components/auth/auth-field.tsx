import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * A labelled input for the auth screens, with its first validation message
 * rendered underneath and wired up through `aria-describedby`. Password
 * inputs get an eye button that toggles whether the value is readable.
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
  const [revealed, setRevealed] = useState(false);
  const message = errors?.[0];
  const errorId = `${id}-error`;
  const isPassword = inputProps.type === "password";

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? errorId : undefined}
          {...inputProps}
          type={isPassword && revealed ? "text" : inputProps.type}
          className={isPassword ? "pr-9" : undefined}
        />
        {isPassword ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            onClick={() => setRevealed((value) => !value)}
            className="text-muted-foreground absolute inset-y-0 right-1 my-auto"
          >
            {revealed ? <EyeOff /> : <Eye />}
          </Button>
        ) : null}
      </div>
      {message ? (
        <p id={errorId} className="text-destructive text-xs">
          {message}
        </p>
      ) : null}
    </div>
  );
}
