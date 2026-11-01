"use client";

import { useId, useState } from "react";

import { MacroDot, type MacroName } from "@/components/segmented-bar";
import { FieldError } from "@/components/status-line";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { UnitInput } from "@/components/unit-input";
import type { IngredientFieldErrors } from "@/lib/ingredients/form-state";
import { formatMacro } from "@/lib/ingredients/format";
import type { Ingredient } from "@/lib/ingredients/types";

type MacroFieldName =
  "caloriesPer100g" | "proteinPer100g" | "carbsPer100g" | "fatPer100g";

/**
 * The four macro inputs, with the unit shown inside them. Bounds are validated
 * by `ingredientSchema` on submit so the message comes back as an inline field
 * error instead of a native validation popup.
 */
const macroFields: {
  name: MacroFieldName;
  macro?: MacroName;
  label: string;
  unit: string;
}[] = [
  { name: "caloriesPer100g", label: "Calories", unit: "kcal" },
  { name: "proteinPer100g", macro: "protein", label: "Protein", unit: "g" },
  { name: "carbsPer100g", macro: "carbs", label: "Carbs", unit: "g" },
  { name: "fatPer100g", macro: "fat", label: "Fat", unit: "g" },
];

/**
 * Seeds a macro input from an existing ingredient, formatting numbers the same
 * way they are displayed. A missing ingredient or macro starts empty.
 */
function seedMacro(
  ingredient: Ingredient | undefined,
  name: MacroFieldName,
): string {
  const value = ingredient?.[name];
  return value === undefined ? "" : formatMacro(value);
}

/**
 * Name plus per-100 g macro inputs, shared by the create form and the edit
 * dialog. The inputs are controlled by local state so React re-applies the
 * entered values after the native form reset that every server action
 * submission triggers; a failed submit therefore keeps the values, while a
 * successful one clears them through the parent's `resetKey` remount.
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
  const [name, setName] = useState(ingredient?.name ?? "");
  const [values, setValues] = useState<Record<MacroFieldName, string>>(() => ({
    caloriesPer100g: seedMacro(ingredient, "caloriesPer100g"),
    proteinPer100g: seedMacro(ingredient, "proteinPer100g"),
    carbsPer100g: seedMacro(ingredient, "carbsPer100g"),
    fatPer100g: seedMacro(ingredient, "fatPer100g"),
  }));

  return (
    <FieldGroup className="gap-4">
      <Field data-invalid={nameErrors ? true : undefined}>
        <FieldLabel htmlFor={nameId}>Name</FieldLabel>
        <Input
          id={nameId}
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Chicken breast, raw"
          aria-invalid={nameErrors ? true : undefined}
          aria-describedby={nameErrors ? nameErrorId : undefined}
        />
        <FieldError id={nameErrorId} errors={nameErrors} />
      </Field>

      <FieldSet className="gap-2">
        <FieldLegend
          variant="label"
          className="text-muted-foreground font-normal"
        >
          Per 100 g of product
        </FieldLegend>
        <div className="grid grid-cols-2 gap-3">
          {macroFields.map((field) => {
            const fieldId = `${baseId}-${field.name}`;
            const errorId = `${fieldId}-error`;
            const errors = fieldErrors[field.name];

            return (
              <Field
                key={field.name}
                className="min-w-0 content-start"
                data-invalid={errors ? true : undefined}
              >
                <FieldLabel htmlFor={fieldId}>
                  {field.macro ? <MacroDot macro={field.macro} /> : null}
                  <span>
                    {field.label}
                    <span className="sr-only"> ({field.unit})</span>
                  </span>
                </FieldLabel>
                <UnitInput
                  unit={field.unit}
                  id={fieldId}
                  name={field.name}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={values[field.name]}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [field.name]: event.target.value,
                    }))
                  }
                  placeholder="0"
                  aria-invalid={errors ? true : undefined}
                  aria-describedby={errors ? errorId : undefined}
                />
                <FieldError id={errorId} errors={errors} />
              </Field>
            );
          })}
        </div>
      </FieldSet>
    </FieldGroup>
  );
}
