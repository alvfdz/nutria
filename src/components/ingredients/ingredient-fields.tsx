"use client";

import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IngredientFieldErrors } from "@/lib/ingredients/form-state";
import { formatMacro } from "@/lib/ingredients/format";
import type { Ingredient } from "@/lib/ingredients/types";

type MacroFieldName =
  | "caloriesPer100g"
  | "proteinPer100g"
  | "carbsPer100g"
  | "fatPer100g";

/** The four macro inputs, with the unit and validation ceiling each one uses. */
const macroFields: {
  name: MacroFieldName;
  label: string;
  unit: string;
  max: number;
}[] = [
  { name: "caloriesPer100g", label: "Calories", unit: "kcal", max: 900 },
  { name: "proteinPer100g", label: "Protein", unit: "g", max: 100 },
  { name: "carbsPer100g", label: "Carbohydrates", unit: "g", max: 100 },
  { name: "fatPer100g", label: "Fat", unit: "g", max: 100 },
];

/**
 * Renders the first validation message for a field, wired to the input through
 * `aria-describedby`. Renders nothing when the field is valid.
 */
function FieldError({
  id,
  errors,
}: {
  id: string;
  errors: string[] | undefined;
}) {
  const message = errors?.[0];
  if (!message) return null;

  return (
    <p id={id} className="text-destructive text-xs">
      {message}
    </p>
  );
}

/**
 * Name plus per-100 g macro inputs, shared by the create form and the edit
 * dialog. Uncontrolled so the browser owns the values and a submit does not
 * need a controlled round trip.
 */
export function IngredientFields({
  ingredient,
  fieldErrors,
  idPrefix,
}: {
  ingredient?: Ingredient;
  fieldErrors: IngredientFieldErrors;
  idPrefix?: string;
}) {
  const generatedId = useId();
  const baseId = idPrefix ?? generatedId;
  const nameId = `${baseId}-name`;
  const nameErrorId = `${baseId}-name-error`;
  const nameErrors = fieldErrors.name;

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor={nameId}>Name</Label>
        <Input
          id={nameId}
          name="name"
          defaultValue={ingredient?.name}
          placeholder="Chicken breast, raw"
          required
          aria-invalid={nameErrors ? true : undefined}
          aria-describedby={nameErrors ? nameErrorId : undefined}
        />
        <FieldError id={nameErrorId} errors={nameErrors} />
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-muted-foreground mb-1 text-xs font-medium">
          Per 100 g of product
        </legend>
        <div className="grid grid-cols-2 gap-3">
          {macroFields.map((field) => {
            const fieldId = `${baseId}-${field.name}`;
            const errorId = `${fieldId}-error`;
            const errors = fieldErrors[field.name];
            const macro = ingredient?.[field.name];
            const defaultValue =
              macro === undefined ? undefined : formatMacro(macro);

            return (
              <div key={field.name} className="grid gap-1.5">
                <Label htmlFor={fieldId}>
                  {field.label}{" "}
                  <span className="text-muted-foreground font-normal">
                    ({field.unit})
                  </span>
                </Label>
                <Input
                  id={fieldId}
                  name={field.name}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  max={field.max}
                  defaultValue={defaultValue}
                  placeholder="0"
                  required
                  aria-invalid={errors ? true : undefined}
                  aria-describedby={errors ? errorId : undefined}
                />
                <FieldError id={errorId} errors={errors} />
              </div>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
