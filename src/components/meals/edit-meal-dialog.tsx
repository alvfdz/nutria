"use client";

import { useActionState, useEffect, useId, useRef } from "react";

import type { DialogRoot } from "@base-ui/react/dialog";
import { cn } from "cn";

import { updateMealAction } from "@/app/(app)/meals/actions";
import {
  MEAL_BODY_CLASS,
  MEAL_DIALOG_CLASS,
  MEAL_FORM_CLASS,
  MealFields,
} from "@/components/meals/meal-fields";
import { StatusLine } from "@/components/status-line";
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
import { CARD_TITLE_CLASS, OVERLAY_THEME_CLASS } from "@/lib/design-system";
import type { Ingredient } from "@/lib/ingredients/types";
import {
  initialMealFormState,
  type MealFieldErrors,
} from "@/lib/meals/form-state";
import type { Meal } from "@/lib/meals/types";

/**
 * Modal for editing an existing meal. Opens on mount, submits through the
 * update action, and closes itself once the save succeeds.
 *
 * @param props.meal The meal to edit.
 * @param props.ingredients The ingredients a meal can be built from.
 * @param props.onClose Called once the dialog has finished closing.
 * @param props.onSaved Called with the name of the saved meal.
 * @returns The dialog; never throws.
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
      <DialogContent className={cn(OVERLAY_THEME_CLASS, MEAL_DIALOG_CLASS)}>
        <DialogHeader>
          <DialogTitle className={CARD_TITLE_CLASS}>Edit meal</DialogTitle>
          <DialogDescription className="wrap-anywhere">
            Update the ingredients that make up {meal.name}.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className={MEAL_FORM_CLASS}>
          <input type="hidden" name="id" value={meal.id} />
          <div className={MEAL_BODY_CLASS}>
            <MealFields
              meal={meal}
              ingredients={ingredients}
              fieldErrors={fieldErrors}
              idPrefix={baseId}
            />
          </div>

          {state.formError ? (
            <StatusLine valid={false} role="alert">
              {state.formError}
            </StatusLine>
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
