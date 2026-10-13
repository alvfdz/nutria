"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import type { DialogRoot } from "@base-ui/react/dialog";
import { Search } from "lucide-react";

import { assignMealAction } from "@/app/calendar/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDayLabel } from "@/lib/calendar/week";
import { formatMacro } from "@/lib/ingredients/format";
import { computeMealTotals } from "@/lib/meals/macros";
import type { Meal } from "@/lib/meals/types";
import { initialAssignMealState } from "@/lib/plan/form-state";
import type { SlotView } from "@/lib/plan/types";

/**
 * Modal for adding a meal template to one slot of one day. Shows what is left
 * of the slot's budget, filters the library by name, and flags templates that
 * would push the slot over its kcal target. One small form per row submits the
 * shared assign action, so keyboard activation works without JavaScript.
 *
 * @param props.date The day's key, `YYYY-MM-DD`.
 * @param props.slot The slot being filled.
 * @param props.meals The whole meal library to choose from.
 * @param props.onClose Called once the dialog has finished closing.
 * @param props.onAssigned Called with the planned meal's name on success.
 */
export function AssignMealDialog({
  date,
  slot,
  meals,
  onClose,
  onAssigned,
}: {
  date: string;
  slot: SlotView;
  meals: Meal[];
  onClose: () => void;
  onAssigned: (name: string) => void;
}) {
  const [state, formAction, pending] = useActionState(
    assignMealAction,
    initialAssignMealState,
  );
  const actionsRef = useRef<DialogRoot.Actions>(null);
  const [query, setQuery] = useState("");
  const dateLabel = formatDayLabel(date);

  const remaining = {
    calories: slot.target.calories - slot.totals.calories,
    protein: slot.target.proteinGrams - slot.totals.protein,
    carbs: slot.target.carbsGrams - slot.totals.carbs,
    fat: slot.target.fatGrams - slot.totals.fat,
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return needle
      ? meals.filter((meal) => meal.name.toLowerCase().includes(needle))
      : meals;
  }, [meals, query]);

  const plannedMealIds = useMemo(
    () => new Set(slot.meals.map((meal) => meal.mealId)),
    [slot.meals],
  );

  useEffect(() => {
    if (state.status !== "success" || state.assignedName === undefined) return;

    onAssigned(state.assignedName);
    actionsRef.current?.close();
  }, [state, onAssigned]);

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
          <DialogTitle>Add to {slot.name}</DialogTitle>
          <DialogDescription>
            Pick a meal template for {dateLabel}.{" "}
            <span className="text-foreground font-medium tabular-nums">
              {formatMacro(remaining.calories)} kcal
            </span>{" "}
            remaining (P {formatMacro(remaining.protein)} · C{" "}
            {formatMacro(remaining.carbs)} · F {formatMacro(remaining.fat)}).
          </DialogDescription>
        </DialogHeader>

        {meals.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Your meal library is empty.{" "}
            <Link href="/meals" className="text-foreground underline">
              Build a meal
            </Link>{" "}
            to start planning.
          </p>
        ) : (
          <>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search meals"
                aria-label="Search meals"
                className="pl-8"
              />
            </div>

            {filtered.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No meals match that search.
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                <ul className="grid gap-1">
                  {filtered.map((meal) => {
                    const totals = computeMealTotals(meal);
                    const already = plannedMealIds.has(meal.id);
                    const over = totals.calories - remaining.calories;

                    return (
                      <li key={meal.id}>
                        <form action={formAction}>
                          <input type="hidden" name="date" value={date} />
                          <input
                            type="hidden"
                            name="mealSlotId"
                            value={slot.id}
                          />
                          <input type="hidden" name="mealId" value={meal.id} />
                          <input
                            type="hidden"
                            name="mealName"
                            value={meal.name}
                          />
                          <Button
                            type="submit"
                            variant="ghost"
                            disabled={already || pending}
                            aria-label={`Add ${meal.name}`}
                            className="h-auto w-full justify-between gap-3 py-2 text-left"
                          >
                            <span className="flex min-w-0 flex-col items-start">
                              <span className="max-w-full truncate text-sm font-medium">
                                {meal.name}
                              </span>
                              <span className="text-muted-foreground text-xs tabular-nums">
                                P {formatMacro(totals.protein)} · C{" "}
                                {formatMacro(totals.carbs)} · F{" "}
                                {formatMacro(totals.fat)}
                              </span>
                            </span>
                            <span className="flex shrink-0 flex-col items-end">
                              <span className="text-sm tabular-nums">
                                {formatMacro(totals.calories)} kcal
                              </span>
                              {already ? (
                                <span className="text-muted-foreground text-xs">
                                  Already added
                                </span>
                              ) : over > 0 ? (
                                <span className="text-muted-foreground text-xs tabular-nums">
                                  over by {formatMacro(over)}
                                </span>
                              ) : null}
                            </span>
                          </Button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}

        {state.formError ? (
          <p role="alert" className="text-destructive text-sm">
            {state.formError}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
