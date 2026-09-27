"use client";

import { useActionState, useId } from "react";

import { createIngredientAction } from "@/app/ingredients/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  initialIngredientFormState,
  type IngredientFieldErrors,
} from "@/lib/ingredients/form-state";

type MacroFieldName =
  | "caloriesPer100g"
  | "proteinPer100g"
  | "carbsPer100g"
  | "fatPer100g";

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

export function NewIngredientForm() {
  const [state, formAction, pending] = useActionState(
    createIngredientAction,
    initialIngredientFormState,
  );
  const baseId = useId();
  const nameId = `${baseId}-name`;
  const nameErrorId = `${baseId}-name-error`;
  const fieldErrors: IngredientFieldErrors = state.fieldErrors ?? {};
  const nameErrors = fieldErrors.name;

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>New ingredient</CardTitle>
          <CardDescription>
            A raw ingredient and its macros per 100 g of product.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div key={state.resetKey} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor={nameId}>Name</Label>
              <Input
                id={nameId}
                name="name"
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

          {state.formError ? (
            <p role="alert" className="text-destructive text-sm">
              {state.formError}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Add ingredient"}
          </Button>
        </CardFooter>
      </Card>

      <p role="status" className="sr-only">
        {state.status === "success"
          ? `${state.savedName} added to your ingredient library.`
          : ""}
      </p>
    </form>
  );
}
