"use client";

import { useActionState, useEffect, useId, useRef } from "react";

import type { DialogRoot } from "@base-ui/react/dialog";

import { updateMealAction } from "@/app/meals/actions";
import { MealFields } from "@/components/meals/meal-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Ingredient } from "@/lib/ingredients/types";
import {
  initialMealFormState,
  type MealFieldErrors,
} from "@/lib/meals/form-state";
import type { Meal } from "@/lib/meals/types";

/**
 * Modal for editing an existing meal. Opens on mount, submits through the
 * update action, and closes itself once the save succeeds.
 */
export function EditMealDialog({
  meal,
  ingredients,
  onClose,
  onSaved,
}: {
  meal: Meal;
  ingredients: Ingredient[];
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateMealAction,
    initialMealFormState,
  );
  const actionsRef = useRef<DialogRoot.Actions>(null);
  const baseId = useId();
  const fieldErrors: MealFieldErrors = state.fieldErrors ?? {};
  const savedName = state.status === "success" ? state.savedName : undefined;

  useEffect(() => {
    if (savedName === undefined) return;

    onSaved(savedName);
    actionsRef.current?.close();
  }, [savedName, onSaved]);

  return (
    <Dialog
      defaultOpen
      actionsRef={actionsRef}
      onOpenChangeComplete={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit meal</DialogTitle>
          <DialogDescription className="wrap-anywhere">
            Update the ingredients that make up {meal.name}.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={meal.id} />
          <MealFields
            meal={meal}
            ingredients={ingredients}
            fieldErrors={fieldErrors}
            idPrefix={baseId}
          />

          {state.formError ? (
            <p role="alert" className="text-destructive text-sm">
              {state.formError}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
