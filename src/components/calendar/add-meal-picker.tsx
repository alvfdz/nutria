"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { Search } from "lucide-react";

import { assignMealAction } from "@/app/calendar/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMacro } from "@/lib/ingredients/format";
import { computeMealTotals } from "@/lib/meals/macros";
import type { Meal } from "@/lib/meals/types";
import { initialAssignMealState } from "@/lib/plan/form-state";
import type { SlotView } from "@/lib/plan/types";

/**
 * The food panel's picker for adding a meal template. Filters the library by
 * name and flags templates that would push the food past its kcal target.
 * Templates already planned in the food are marked with how many copies sit
 * there, but stay addable — a food often takes two or three servings of the
 * same template. One small form per row submits the shared assign action, so
 * keyboard activation works without JavaScript. Unlike the modal it replaces,
 * a successful add keeps the picker open.
 *
 * @param props.date The day's key, `YYYY-MM-DD`.
 * @param props.slot The food being filled.
 * @param props.meals The whole meal library to choose from.
 * @param props.onAssigned Called with the planned meal's name on success.
 */
export function AddMealPicker({
  date,
  slot,
  meals,
  onAssigned,
}: {
  date: string;
  slot: SlotView;
  meals: Meal[];
  onAssigned: (name: string) => void;
}) {
  const [state, formAction, pending] = useActionState(
    assignMealAction,
    initialAssignMealState,
  );
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return needle
      ? meals.filter((meal) => meal.name.toLowerCase().includes(needle))
      : meals;
  }, [meals, query]);

  const plannedCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const meal of slot.meals) {
      counts.set(meal.mealId, (counts.get(meal.mealId) ?? 0) + 1);
    }

    return counts;
  }, [slot.meals]);

  useEffect(() => {
    if (state.status !== "success" || state.assignedName === undefined) return;

    onAssigned(state.assignedName);
  }, [state, onAssigned]);

  if (meals.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Your meal library is empty.{" "}
        <Link href="/meals" className="text-foreground underline">
          Build a meal
        </Link>{" "}
        to start planning.
      </p>
    );
  }

  const remaining = slot.target.calories - slot.totals.calories;

  return (
    <div className="grid gap-2">
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
          <ul className="grid min-w-0 gap-1">
            {filtered.map((meal) => {
              const totals = computeMealTotals(meal);
              const added = plannedCounts.get(meal.id) ?? 0;
              const over = totals.calories - remaining;

              return (
                <li key={meal.id} className="min-w-0">
                  <form action={formAction}>
                    <input type="hidden" name="date" value={date} />
                    <input type="hidden" name="mealSlotId" value={slot.id} />
                    <input type="hidden" name="mealId" value={meal.id} />
                    <input type="hidden" name="mealName" value={meal.name} />
                    <Button
                      type="submit"
                      variant="ghost"
                      disabled={pending}
                      aria-label={`Add ${meal.name}`}
                      className="h-auto w-full justify-between gap-3 py-2 text-left"
                    >
                      <span className="flex min-w-0 flex-col items-start">
                        <span
                          className="max-w-full truncate text-sm font-medium"
                          title={meal.name}
                        >
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
                        {added > 0 ? (
                          <span className="text-muted-foreground text-xs tabular-nums">
                            Added ×{added}
                          </span>
                        ) : null}
                        {over > 0 ? (
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

      {state.formError ? (
        <p role="alert" className="text-destructive text-sm">
          {state.formError}
        </p>
      ) : null}
    </div>
  );
}
