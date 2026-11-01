"use client";

import { useActionState, useEffect, useId, useRef } from "react";

import type { DialogRoot } from "@base-ui/react/dialog";
import { cn } from "cn";

import { createIngredientAction } from "@/app/(app)/ingredients/actions";
import { IngredientFields } from "@/components/ingredients/ingredient-fields";
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
import {
  initialIngredientFormState,
  type IngredientFieldErrors,
} from "@/lib/ingredients/form-state";

/**
 * Modal for adding an ingredient by hand. Opens on mount and stays open after a
 * save, with the fields cleared and focus back on the name, so several
 * ingredients can be entered in a row.
 *
 * @param props.onClose Called once the dialog has finished closing.
 * @param props.onSaved Called with the name of each saved ingredient.
 * @returns The dialog; never throws.
 */
export function NewIngredientDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [state, formAction, pending] = useActionState(
    createIngredientAction,
    initialIngredientFormState,
  );
  const actionsRef = useRef<DialogRoot.Actions>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const baseId = useId();
  const fieldErrors: IngredientFieldErrors = state.fieldErrors ?? {};

  // Keyed on `state`, which is a fresh object per submit: saving the same name
  // twice must report twice.
  useEffect(() => {
    if (state.status !== "success" || state.savedName === undefined) return;

    onSaved(state.savedName);
    formRef.current?.querySelector<HTMLInputElement>('[name="name"]')?.focus();
  }, [state, onSaved]);

  return (
    <Dialog
      defaultOpen
      actionsRef={actionsRef}
      onOpenChangeComplete={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className={cn(OVERLAY_THEME_CLASS, "sm:max-w-md")}>
        <DialogHeader>
          <DialogTitle className={CARD_TITLE_CLASS}>New ingredient</DialogTitle>
          <DialogDescription>
            A food and its macros, from the label.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="grid gap-4">
          <div key={state.resetKey}>
            <IngredientFields fieldErrors={fieldErrors} idPrefix={baseId} />
          </div>

          {state.formError ? (
            <StatusLine valid={false} role="alert">
              {state.formError}
            </StatusLine>
          ) : null}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Done
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Add ingredient"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
