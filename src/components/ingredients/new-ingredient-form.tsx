"use client";

import { useActionState, useId } from "react";

import { createIngredientAction } from "@/app/ingredients/actions";
import { IngredientFields } from "@/components/ingredients/ingredient-fields";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  initialIngredientFormState,
  type IngredientFieldErrors,
} from "@/lib/ingredients/form-state";

export function NewIngredientForm() {
  const [state, formAction, pending] = useActionState(
    createIngredientAction,
    initialIngredientFormState,
  );
  const baseId = useId();
  const fieldErrors: IngredientFieldErrors = state.fieldErrors ?? {};

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
          <div key={state.resetKey}>
            <IngredientFields fieldErrors={fieldErrors} idPrefix={baseId} />
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
