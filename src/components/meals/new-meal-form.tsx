"use client";

import { useActionState, useId } from "react";

import Link from "next/link";

import { createMealAction } from "@/app/(app)/meals/actions";
import { MealFields } from "@/components/meals/meal-fields";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Ingredient } from "@/lib/ingredients/types";
import {
  initialMealFormState,
  type MealFieldErrors,
} from "@/lib/meals/form-state";

/**
 * Card form for adding a meal. Clears itself after a successful save by
 * remounting the fields against a new reset key. When the ingredient library
 * is empty there is nothing to build a meal from, so the card invites the user
 * to add ingredients first instead.
 */
export function NewMealForm({ ingredients }: { ingredients: Ingredient[] }) {
  const [state, formAction, pending] = useActionState(
    createMealAction,
    initialMealFormState,
  );
  const baseId = useId();
  const fieldErrors: MealFieldErrors = state.fieldErrors ?? {};

  if (ingredients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>A meal is a set of ingredients</CardTitle>
          <CardDescription>
            Give a group of ingredients a name and a quantity each, and its
            macros total themselves.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Save the meals you cook often, then plan them into a day against
            your macro budget.
          </p>
          <Link
            href="/ingredients"
            className={buttonVariants({
              variant: "outline",
              className: "mt-4",
            })}
          >
            Add ingredients first
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>New meal</CardTitle>
          <CardDescription>
            A named set of ingredients, each with the quantity the meal uses.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div key={state.resetKey}>
            <MealFields
              ingredients={ingredients}
              fieldErrors={fieldErrors}
              idPrefix={baseId}
            />
          </div>

          {state.formError ? (
            <p role="alert" className="text-destructive text-sm">
              {state.formError}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Add meal"}
          </Button>
        </CardFooter>
      </Card>

      <p role="status" className="sr-only">
        {state.status === "success"
          ? `${state.savedName} added to your meal library.`
          : ""}
      </p>
    </form>
  );
}
