"use client";

import { useActionState, useEffect, useRef } from "react";

import type { AlertDialogRoot } from "@base-ui/react/alert-dialog";

import { deleteMealAction } from "@/app/(app)/meals/actions";
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
import { initialMealDeleteState } from "@/lib/meals/form-state";
import type { Meal } from "@/lib/meals/types";

/**
 * Confirmation modal for removing a meal. Only the submit button performs the
 * destructive action, so cancelling is the safe default.
 *
 * @param props.meal The meal to remove.
 * @param props.onClose Called once the modal has finished closing.
 * @param props.onDeleted Called with the name of the deleted meal.
 * @returns The modal; never throws.
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
      <AlertDialogContent size="sm" className={OVERLAY_THEME_CLASS}>
        <AlertDialogHeader>
          <AlertDialogTitle className={CARD_TITLE_CLASS}>
            Delete meal
          </AlertDialogTitle>
          <AlertDialogDescription className="wrap-anywhere">
            This permanently removes {meal.name} from your meal library. This
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="id" value={meal.id} />
          <input type="hidden" name="name" value={meal.name} />

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
      </AlertDialogContent>
    </AlertDialog>
  );
}
