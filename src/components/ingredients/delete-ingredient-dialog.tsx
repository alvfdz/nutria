"use client";

import { useActionState, useEffect, useRef } from "react";

import type { AlertDialogRoot } from "@base-ui/react/alert-dialog";

import { deleteIngredientAction } from "@/app/ingredients/actions";
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
import { initialIngredientDeleteState } from "@/lib/ingredients/form-state";
import type { Ingredient } from "@/lib/ingredients/types";

/**
 * Confirmation modal for removing an ingredient. Only the submit button
 * performs the destructive action, so cancelling is the safe default.
 */
export function DeleteIngredientDialog({
  ingredient,
  onClose,
  onDeleted,
}: {
  ingredient: Ingredient;
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

  return (
    <AlertDialog
      defaultOpen
      actionsRef={actionsRef}
      onOpenChangeComplete={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete ingredient</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes {ingredient.name} from your library. This
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={ingredient.id} />
          <input type="hidden" name="name" value={ingredient.name} />

          {state.formError ? (
            <p role="alert" className="text-destructive text-sm">
              {state.formError}
            </p>
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
      </AlertDialogContent>
    </AlertDialog>
  );
}
