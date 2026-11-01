import type { ComponentProps } from "react";

import { cn } from "cn";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

/**
 * A number input with its unit inside, muted and hidden from assistive
 * technology because the label already states it. The value sits right beside
 * the unit. The browser's number spinners are removed; arrow keys still step.
 *
 * @param props Standard input attributes, passed to the inner input.
 * @param props.unit The unit to show, such as `g` or `kcal`.
 * @param props.groupClassName Classes for the group that frames the input.
 * @returns The input with its unit suffix; never throws.
 */
export function UnitInput({
  unit,
  groupClassName,
  className,
  ...props
}: ComponentProps<typeof InputGroupInput> & {
  unit: string;
  groupClassName?: string;
}) {
  return (
    <InputGroup className={groupClassName}>
      <InputGroupInput
        className={cn(
          "text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          className,
        )}
        {...props}
      />
      <InputGroupAddon
        align="inline-end"
        aria-hidden="true"
        className="font-normal"
      >
        {unit}
      </InputGroupAddon>
    </InputGroup>
  );
}
