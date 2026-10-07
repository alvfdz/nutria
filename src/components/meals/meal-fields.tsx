"use client";

import { useId, useRef, useState } from "react";

import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Ingredient } from "@/lib/ingredients/types";
import type { MealFieldErrors } from "@/lib/meals/form-state";
import type { Meal } from "@/lib/meals/types";

/** One builder row: a stable key plus the values an edit seeds it with. */
type Row = {
  /** React key, stable across add/remove so uncontrolled inputs keep values. */
  key: string;
  /** Ingredient preselected in the row, when editing an existing meal. */
  ingredientId?: string;
  /** Quantity pre-filled in the row, when editing an existing meal. */
  grams?: string;
};

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
 * Name plus the ingredient rows of the meal builder, shared by the create form
 * and the edit dialog. The selects and quantity inputs are uncontrolled: rows
 * only track their identity, so the browser owns the values and a submit does
 * not need a controlled round trip. Validation messages are keyed by row index
 * (`items.0.grams`) and render under the input they belong to.
 */
export function MealFields({
  meal,
  ingredients,
  fieldErrors,
  idPrefix,
}: {
  meal?: Meal;
  ingredients: Ingredient[];
  fieldErrors: MealFieldErrors;
  idPrefix?: string;
}) {
  const generatedId = useId();
  const baseId = idPrefix ?? generatedId;
  const nameId = `${baseId}-name`;
  const nameErrorId = `${baseId}-name-error`;
  const nameErrors = fieldErrors.name;
  const itemsErrors = fieldErrors.items;
  // New rows reuse the highest key handed out so far; React keeps it across
  // renders, and the component starts from the number of seeded rows.
  const nextRowId = useRef(meal?.items.length ?? 1);
  const [rows, setRows] = useState<Row[]>(() =>
    meal
      ? meal.items.map((item, index) => ({
          key: `row-${index}`,
          ingredientId: item.ingredientId,
          grams: String(item.grams),
        }))
      : [{ key: "row-0" }],
  );

  const options = ingredients.map((ingredient) => ({
    value: ingredient.id,
    label: ingredient.name,
  }));

  const addRow = () => {
    const key = `row-${nextRowId.current++}`;
    setRows((current) => [...current, { key }]);
  };
  const removeRow = (key: string) => {
    setRows((current) => current.filter((row) => row.key !== key));
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor={nameId}>Name</Label>
        <Input
          id={nameId}
          name="name"
          defaultValue={meal?.name}
          placeholder="Oatmeal & Protein Bowl"
          aria-invalid={nameErrors ? true : undefined}
          aria-describedby={nameErrors ? nameErrorId : undefined}
        />
        <FieldError id={nameErrorId} errors={nameErrors} />
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-muted-foreground mb-1 text-xs font-medium">
          Ingredients
        </legend>

        {rows.map((row, index) => {
          const ingredientErrorId = `${baseId}-ingredient-${index}-error`;
          const gramsId = `${baseId}-grams-${index}`;
          const gramsErrorId = `${gramsId}-error`;
          const ingredientErrors = fieldErrors[`items.${index}.ingredientId`];
          const gramsErrors = fieldErrors[`items.${index}.grams`];

          return (
            <div key={row.key} className="flex items-start gap-2">
              <div className="grid min-w-0 flex-1 gap-1.5">
                <Select
                  name="ingredientId"
                  items={options}
                  defaultValue={row.ingredientId}
                >
                  <SelectTrigger
                    className="w-full"
                    aria-label={`Ingredient ${index + 1}`}
                    aria-invalid={ingredientErrors ? true : undefined}
                    aria-describedby={
                      ingredientErrors ? ingredientErrorId : undefined
                    }
                  >
                    <SelectValue placeholder="Select ingredient" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError id={ingredientErrorId} errors={ingredientErrors} />
              </div>

              <div className="grid w-24 gap-1.5">
                <Input
                  id={gramsId}
                  name="grams"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  defaultValue={row.grams}
                  placeholder="0"
                  aria-label={`Grams ${index + 1}`}
                  aria-invalid={gramsErrors ? true : undefined}
                  aria-describedby={gramsErrors ? gramsErrorId : undefined}
                />
                <FieldError id={gramsErrorId} errors={gramsErrors} />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ingredient ${index + 1}`}
                onClick={() => removeRow(row.key)}
              >
                <X />
              </Button>
            </div>
          );
        })}

        {itemsErrors ? (
          <p className="text-destructive text-xs">{itemsErrors[0]}</p>
        ) : null}

        <div>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus /> Add ingredient
          </Button>
        </div>
      </fieldset>
    </div>
  );
}
