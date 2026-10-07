"use client";

import { useActionState, useEffect, useRef } from "react";

import type { AlertDialogRoot } from "@base-ui/react/alert-dialog";

import { deleteMealAction } from "@/app/meals/actions";
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
import { initialMealDeleteState } from "@/lib/meals/form-state";
import type { Meal } from "@/lib/meals/types";

/**
 * Confirmation modal for removing a meal. Only the submit button performs the
 * destructive action, so cancelling is the safe default.
 */
export function DeleteMealDialog({
  meal,
  onClose,
  onDeleted,
}: {
  meal: Meal;
  onClose: () => void;
  onDeleted: (name: string) => void;
}) {
  const [state, formAction, pending] = useActionState(
    deleteMealAction,
    initialMealDeleteState,
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
          <AlertDialogTitle>Delete meal</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes {meal.name} from your meal library. This
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={meal.id} />
          <input type="hidden" name="name" value={meal.name} />

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
