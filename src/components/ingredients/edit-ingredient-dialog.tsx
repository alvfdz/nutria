"use client";

import { useActionState, useEffect, useId, useRef } from "react";

import type { DialogRoot } from "@base-ui/react/dialog";

import { updateIngredientAction } from "@/app/ingredients/actions";
import { IngredientFields } from "@/components/ingredients/ingredient-fields";
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
import {
  initialIngredientFormState,
  type IngredientFieldErrors,
} from "@/lib/ingredients/form-state";
import type { Ingredient } from "@/lib/ingredients/types";

/**
 * Modal for editing an existing ingredient. Opens on mount, submits through the
 * update action, and closes itself once the save succeeds.
 */
export function EditIngredientDialog({
  ingredient,
  onClose,
  onSaved,
}: {
  ingredient: Ingredient;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateIngredientAction,
    initialIngredientFormState,
  );
  const actionsRef = useRef<DialogRoot.Actions>(null);
  const baseId = useId();
  const fieldErrors: IngredientFieldErrors = state.fieldErrors ?? {};
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
          <DialogTitle>Edit ingredient</DialogTitle>
          <DialogDescription className="wrap-anywhere">
            Update the macros for {ingredient.name}.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={ingredient.id} />
          <IngredientFields
            ingredient={ingredient}
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
