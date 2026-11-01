"use client";

import { useActionState, useEffect, useRef } from "react";

import type { AlertDialogRoot } from "@base-ui/react/alert-dialog";

import { deleteIngredientAction } from "@/app/(app)/ingredients/actions";
import { StatusLine } from "@/components/status-line";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CARD_TITLE_CLASS, OVERLAY_THEME_CLASS } from "@/lib/design-system";
import { initialIngredientDeleteState } from "@/lib/ingredients/form-state";
import { formatMealList } from "@/lib/ingredients/library";
import type { Ingredient } from "@/lib/ingredients/types";

/**
 * Confirmation modal for removing an ingredient. Only the submit button
 * performs the destructive action, so cancelling is the safe default. An
 * ingredient that meals still use cannot be deleted, so the modal names them
 * instead of offering a delete that would be refused.
 *
 * @param props.ingredient The ingredient to remove.
 * @param props.usedIn The names of the meals that use it, if any.
 * @param props.onClose Called once the modal has finished closing.
 * @param props.onDeleted Called with the name of the deleted ingredient.
 * @returns The modal; never throws.
 */
export function DeleteIngredientDialog({
  ingredient,
  usedIn = [],
  onClose,
  onDeleted,
}: {
  ingredient: Ingredient;
  usedIn?: string[];
  onClose: () => void;
  onDeleted: (name: string) => void;
}) {
  const [state, formAction, pending] = useActionState(
    deleteIngredientAction,
    initialIngredientDeleteState,
  );
  const actionsRef = useRef<AlertDialogRoot.Actions>(null);
  const deletedName =
    state.status === "success" ? state.deletedName : undefined;

  useEffect(() => {
    if (deletedName === undefined) return;

    onDeleted(deletedName);
    actionsRef.current?.close();
  }, [deletedName, onDeleted]);

  const inUse = usedIn.length > 0;

  return (
    <AlertDialog
      defaultOpen
      actionsRef={actionsRef}
      onOpenChangeComplete={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent size="sm" className={OVERLAY_THEME_CLASS}>
        <AlertDialogHeader>
          <AlertDialogTitle className={CARD_TITLE_CLASS}>
            {inUse ? "Ingredient in use" : "Delete ingredient"}
          </AlertDialogTitle>
          <AlertDialogDescription className="wrap-anywhere">
            {inUse
              ? `${ingredient.name} is used in ${formatMealList(usedIn)}. Remove it from ${usedIn.length === 1 ? "that meal" : "those meals"} before deleting it.`
              : `This permanently removes ${ingredient.name} from your library. This cannot be undone.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {inUse ? (
          <AlertDialogFooter>
            <AlertDialogCancel className="col-span-2">Close</AlertDialogCancel>
          </AlertDialogFooter>
        ) : (
          <form action={formAction} className="grid gap-4">
            <input type="hidden" name="id" value={ingredient.id} />
            <input type="hidden" name="name" value={ingredient.name} />

            {state.formError ? (
              <StatusLine valid={false} role="alert">
                {state.formError}
              </StatusLine>
            ) : null}

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                type="submit"
                variant="destructive"
                disabled={pending}
              >
                {pending ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
