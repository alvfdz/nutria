"use client";

import { useId, useMemo, useRef, useState } from "react";

import { Plus, X } from "lucide-react";

import { MacroBar } from "@/components/segmented-bar";
import { StatTiles } from "@/components/stat-tile";
import { FieldError } from "@/components/status-line";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { UnitInput } from "@/components/unit-input";
import {
  ICON_STROKE,
  OVERLAY_THEME_CLASS,
  THIN_SPACE,
} from "@/lib/design-system";
import { formatMacro } from "@/lib/ingredients/format";
import type { Ingredient } from "@/lib/ingredients/types";
import { macroCalorieShares, normalizeSearchText } from "@/lib/library";
import {
  keyMealErrorsByRow,
  mealRowErrorKey,
  type KeyedMealErrors,
  type MealFieldErrors,
} from "@/lib/meals/form-state";
import { sumMealItems, type MealTotals } from "@/lib/meals/macros";
import type { Meal } from "@/lib/meals/types";

/**
 * The size of a dialog holding {@link MealFields}: wide enough on desktop for the
 * rows beside the preview, and never taller than the viewport, because a meal can
 * have any number of rows.
 */
export const MEAL_DIALOG_CLASS =
  "flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-lg md:max-w-3xl";

/** The form inside a meal dialog: fills it, so only its body has to scroll. */
export const MEAL_FORM_CLASS = "flex min-h-0 min-w-0 flex-1 flex-col gap-4";

/**
 * What scrolls in a meal dialog, leaving the actions in view. The padding, undone
 * by the margin, keeps the focus rings of the controls from being clipped.
 */
export const MEAL_BODY_CLASS =
  "-m-1 min-h-0 min-w-0 flex-1 overflow-y-auto p-1";

/** The bar of a preview with nothing to divide up yet. */
const NO_SHARES = { proteinPct: 0, carbsPct: 0, fatPct: 0 };

/** One builder row: a stable key plus the values its inputs are bound to. */
type Row = {
  /** React key, stable across add/remove so a row keeps its own values. */
  key: string;
  /** Ingredient selected in the row, if any. */
  ingredientId?: string;
  /** Quantity typed in the row, if any. */
  grams?: string;
};

/** An ingredient as the picker lists it. */
type IngredientOption = {
  /** The ingredient's id. */
  value: string;
  /** The ingredient's name. */
  label: string;
};

/**
 * Whether an ingredient matches what was typed in the picker, the same way the
 * libraries' filters match: ignoring case and accents.
 */
function matchesOption(option: IngredientOption, query: string): boolean {
  return normalizeSearchText(option.label).includes(normalizeSearchText(query));
}

/** Says the preview's totals in a sentence, for assistive technology. */
function describeTotals(totals: MealTotals): string {
  return `This meal: ${formatMacro(totals.calories)} kcal, ${formatMacro(totals.protein)} g protein, ${formatMacro(totals.carbs)} g carbs, ${formatMacro(totals.fat)} g fat.`;
}

/**
 * Name plus the ingredient rows of the meal builder, shared by the create and
 * edit dialogs, with a live preview of the rows entered so far. The preview sits
 * beside the rows on desktop and stays in view as they scroll. The inputs are
 * controlled by local state so React re-applies the entered values after the
 * native form reset that every server action submission triggers; a failed submit
 * therefore keeps the values.
 *
 * A submit's validation messages are attached to the rows it covered, so removing
 * a row can't move them onto another one, and each message goes away as soon as
 * its field changes. They render under the row they belong to, where they have
 * the width for a sentence. The last row can't be removed: its button clears it,
 * so there is always a row to fill in.
 *
 * @param props.meal The meal to seed the fields from, when editing.
 * @param props.ingredients The ingredients a row can pick from.
 * @param props.fieldErrors The validation messages of the last submit.
 * @param props.idPrefix Base for the inputs' ids; generated when omitted.
 * @returns The fields; never throws.
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
  const itemsErrorId = `${baseId}-items-error`;
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
  const [lastFieldErrors, setLastFieldErrors] = useState(fieldErrors);
  const [errors, setErrors] = useState<KeyedMealErrors>(() =>
    keyMealErrorsByRow(
      fieldErrors,
      rows.map((row) => row.key),
    ),
  );

  // A new submit's messages replace what is showing. Adjusted during render, so
  // the stale ones are never painted.
  if (fieldErrors !== lastFieldErrors) {
    setLastFieldErrors(fieldErrors);
    setErrors(
      keyMealErrorsByRow(
        fieldErrors,
        rows.map((row) => row.key),
      ),
    );
  }

  const options = useMemo<IngredientOption[]>(
    () =>
      ingredients.map((ingredient) => ({
        value: ingredient.id,
        label: ingredient.name,
      })),
    [ingredients],
  );
  const optionsById = useMemo(
    () => new Map(options.map((option) => [option.value, option])),
    [options],
  );
  const ingredientsById = useMemo(
    () => new Map(ingredients.map((ingredient) => [ingredient.id, ingredient])),
    [ingredients],
  );

  // Preview the totals from complete rows only: a row needs a chosen ingredient
  // and a positive quantity before it can contribute.
  const previewItems = useMemo(
    () =>
      rows.flatMap((row) => {
        const ingredient = row.ingredientId
          ? ingredientsById.get(row.ingredientId)
          : undefined;
        const grams = Number(row.grams);
        if (!ingredient || !Number.isFinite(grams) || grams <= 0) return [];
        return [{ grams, ingredient }];
      }),
    [rows, ingredientsById],
  );
  const totals = useMemo(() => sumMealItems(previewItems), [previewItems]);

  /** Drops the messages of the given fields, now that they have changed. */
  const clearErrors = (...keys: string[]) => {
    setErrors((current) => {
      if (!keys.some((key) => current[key])) return current;

      const next = { ...current };
      for (const key of keys) delete next[key];
      return next;
    });
  };

  const newRow = (): Row => ({ key: `row-${nextRowId.current++}` });

  const addRow = () => {
    setRows((current) => [...current, newRow()]);
    clearErrors("items");
  };
  const removeRow = (key: string) => {
    // A row's messages go with its key. The last row is replaced rather than
    // removed; the new key also empties what was typed in its picker.
    setRows(
      rows.length > 1 ? rows.filter((row) => row.key !== key) : [newRow()],
    );
  };
  const updateRow = (
    key: string,
    field: "ingredientId" | "grams",
    value: string | undefined,
  ) => {
    setRows((current) =>
      current.map((row) =>
        row.key === key ? { ...row, [field]: value } : row,
      ),
    );
    clearErrors(mealRowErrorKey(key, field), "items");
  };

  return (
    <div className="grid min-w-0 items-start gap-6 md:grid-cols-[minmax(0,1fr)_18rem]">
      <FieldGroup className="min-w-0 gap-4">
        <Field data-invalid={errors.name ? true : undefined}>
          <FieldLabel htmlFor={nameId}>Name</FieldLabel>
          <Input
            id={nameId}
            name="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              clearErrors("name");
            }}
            placeholder="Oatmeal and protein bowl"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? nameErrorId : undefined}
          />
          <FieldError id={nameErrorId} errors={errors.name} />
        </Field>

        <FieldSet className="min-w-0 gap-2">
          <FieldLegend
            variant="label"
            className="text-muted-foreground font-normal"
          >
            Ingredients
          </FieldLegend>

          {rows.map((row, index) => {
            const ingredientErrorId = `${baseId}-${row.key}-ingredient-error`;
            const gramsId = `${baseId}-${row.key}-grams`;
            const gramsErrorId = `${gramsId}-error`;
            const ingredientErrors =
              errors[mealRowErrorKey(row.key, "ingredientId")];
            const gramsErrors = errors[mealRowErrorKey(row.key, "grams")];
            const selected = row.ingredientId
              ? (optionsById.get(row.ingredientId) ?? null)
              : null;
            const rowName = selected?.label ?? `ingredient ${index + 1}`;

            return (
              <div key={row.key} className="grid min-w-0 gap-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <input
                      type="hidden"
                      name="ingredientId"
                      value={row.ingredientId ?? ""}
                    />
                    <Combobox<IngredientOption>
                      items={options}
                      value={selected}
                      filter={matchesOption}
                      itemToStringLabel={(option) => option.label}
                      autoHighlight
                      onValueChange={(option) =>
                        updateRow(row.key, "ingredientId", option?.value)
                      }
                    >
                      <ComboboxInput
                        className="w-full min-w-0 [&_input]:truncate"
                        triggerLabel={`Show ingredients for row ${index + 1}`}
                        title={selected?.label}
                        placeholder="Search ingredients"
                        aria-label={`Ingredient ${index + 1}`}
                        aria-invalid={ingredientErrors ? true : undefined}
                        aria-describedby={
                          ingredientErrors ? ingredientErrorId : undefined
                        }
                      />
                      <ComboboxContent className={OVERLAY_THEME_CLASS}>
                        <ComboboxEmpty>No matching ingredient</ComboboxEmpty>
                        <ComboboxList>
                          {(option: IngredientOption) => (
                            <ComboboxItem
                              key={option.value}
                              value={option}
                              title={option.label}
                            >
                              <span className="min-w-0 truncate">
                                {option.label}
                              </span>
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  </div>

                  <UnitInput
                    unit="g"
                    groupClassName="w-24 shrink-0"
                    id={gramsId}
                    name="grams"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={row.grams ?? ""}
                    onChange={(event) =>
                      updateRow(row.key, "grams", event.target.value)
                    }
                    placeholder="0"
                    aria-label={`Grams ${index + 1}`}
                    aria-invalid={gramsErrors ? true : undefined}
                    aria-describedby={gramsErrors ? gramsErrorId : undefined}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground shrink-0"
                    aria-label={`${rows.length > 1 ? "Remove" : "Clear"} ${rowName}`}
                    onClick={() => removeRow(row.key)}
                  >
                    <X strokeWidth={ICON_STROKE} />
                  </Button>
                </div>

                <FieldError id={ingredientErrorId} errors={ingredientErrors} />
                <FieldError id={gramsErrorId} errors={gramsErrors} />
              </div>
            );
          })}

          <FieldError id={itemsErrorId} errors={errors.items} />

          <div>
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus
                data-icon="inline-start"
                strokeWidth={ICON_STROKE}
                className="text-brand"
              />
              Add ingredient
            </Button>
          </div>
        </FieldSet>
      </FieldGroup>

      <div className="grid min-w-0 gap-3 md:sticky md:top-0">
        <dl className="flex items-baseline justify-between gap-2">
          <dt className="type-caption text-muted-foreground">This meal</dt>
          <dd className="text-lg font-semibold">
            {formatMacro(totals.calories)}
            {THIN_SPACE}
            <span className="text-muted-foreground text-sm font-normal">
              kcal
            </span>
          </dd>
        </dl>
        <MacroBar {...(macroCalorieShares(totals) ?? NO_SHARES)} />
        <StatTiles
          protein={formatMacro(totals.protein)}
          carbs={formatMacro(totals.carbs)}
          fat={formatMacro(totals.fat)}
        />
        <p role="status" className="sr-only">
          {previewItems.length > 0 ? describeTotals(totals) : ""}
        </p>
      </div>
    </div>
  );
}
