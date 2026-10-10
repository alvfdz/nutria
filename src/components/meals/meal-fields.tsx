"use client";

import { useId, useMemo, useRef, useState } from "react";

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
import { formatMacro } from "@/lib/ingredients/format";
import type { Ingredient } from "@/lib/ingredients/types";
import type { MealFieldErrors } from "@/lib/meals/form-state";
import { sumMealItems } from "@/lib/meals/macros";
import type { Meal } from "@/lib/meals/types";

/** One builder row: a stable key plus the values its inputs are bound to. */
type Row = {
  /** React key, stable across add/remove so a row keeps its own values. */
  key: string;
  /** Ingredient selected in the row, if any. */
  ingredientId?: string;
  /** Quantity typed in the row, if any. */
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
 * and the edit dialog. The inputs are controlled by local state so React
 * re-applies the entered values after the native form reset that every server
 * action submission triggers; a failed submit therefore keeps the values, while
 * a successful one clears them through the parent's `resetKey` remount.
 * Validation messages are keyed by row index (`items.0.grams`) and render under
 * the input they belong to. A live preview totals the rows entered so far, and
 * each quantity field carries a gram suffix.
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
  const [name, setName] = useState(meal?.name ?? "");
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

  const ingredientsById = useMemo(
    () => new Map(ingredients.map((ingredient) => [ingredient.id, ingredient])),
    [ingredients],
  );

  // Preview the totals from complete rows only: a row needs a chosen ingredient
  // and a positive quantity before it can contribute.
  const totals = useMemo(
    () =>
      sumMealItems(
        rows.flatMap((row) => {
          const ingredient = row.ingredientId
            ? ingredientsById.get(row.ingredientId)
            : undefined;
          const grams = Number(row.grams);
          if (!ingredient || !Number.isFinite(grams) || grams <= 0) return [];
          return [{ grams, ingredient }];
        }),
      ),
    [rows, ingredientsById],
  );

  const previewStats = [
    { label: "Calories", unit: "kcal", value: totals.calories },
    { label: "Protein", unit: "g", value: totals.protein },
    { label: "Carbs", unit: "g", value: totals.carbs },
    { label: "Fat", unit: "g", value: totals.fat },
  ];

  const addRow = () => {
    const key = `row-${nextRowId.current++}`;
    setRows((current) => [...current, { key }]);
  };
  const removeRow = (key: string) => {
    setRows((current) => current.filter((row) => row.key !== key));
  };
  const updateRow = (key: string, patch: Partial<Omit<Row, "key">>) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor={nameId}>Name</Label>
        <Input
          id={nameId}
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
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
                  value={row.ingredientId ?? null}
                  onValueChange={(value) =>
                    updateRow(row.key, { ingredientId: value ?? undefined })
                  }
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
                <div className="relative">
                  <Input
                    id={gramsId}
                    name="grams"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={row.grams ?? ""}
                    onChange={(event) =>
                      updateRow(row.key, { grams: event.target.value })
                    }
                    placeholder="0"
                    className="pr-6"
                    aria-label={`Grams ${index + 1}`}
                    aria-invalid={gramsErrors ? true : undefined}
                    aria-describedby={gramsErrors ? gramsErrorId : undefined}
                  />
                  <span
                    aria-hidden="true"
                    className="text-muted-foreground pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm"
                  >
                    g
                  </span>
                </div>
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

      <div className="grid gap-2">
        <p className="text-muted-foreground text-xs font-medium">
          Preview · this meal
        </p>
        <dl className="grid grid-cols-4 gap-2 rounded-lg border border-border p-3">
          {previewStats.map((stat) => (
            <div key={stat.label} className="grid gap-0.5 text-center">
              <dt className="text-muted-foreground text-xs">{stat.label}</dt>
              <dd className="text-sm font-medium tabular-nums">
                {formatMacro(stat.value)}{" "}
                <span className="text-muted-foreground font-normal">
                  {stat.unit}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
