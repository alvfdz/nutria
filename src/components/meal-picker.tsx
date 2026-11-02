"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { cn } from "cn";
import { Search } from "lucide-react";

import { MacroDot, type MacroName } from "@/components/segmented-bar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { CARD_TITLE_CLASS, ICON_STROKE, THIN_SPACE } from "@/lib/design-system";
import { formatWhole } from "@/lib/goals/display";
import { computeMealTotals } from "@/lib/meals/macros";
import type { Meal } from "@/lib/meals/types";

/** The macros a picker row lists, with the initial shown beside each dot. */
const MACRO_INITIALS: { macro: MacroName; initial: string }[] = [
  { macro: "protein", initial: "P" },
  { macro: "carbs", initial: "C" },
  { macro: "fat", initial: "F" },
];

/**
 * A searchable list of meal templates, where each row submits its own small
 * form, so keyboard activation works without JavaScript. Rows flag a template
 * that wouldn't fit the kcal the slot has left. What choosing a row does is up
 * to the caller, which supplies the form action and the fields it posts.
 *
 * @param props.meals The templates to choose from.
 * @param props.remainingCalories Kcal the slot has left, for the "over by" flag.
 * @param props.formAction The form action each row submits.
 * @param props.pending Whether a submit is in flight.
 * @param props.formError Message of the last failed submit, if any.
 * @param props.fields Hidden fields a row posts for its meal.
 * @param props.rowLabel Accessible name of a row, e.g. `Add Oatmeal`.
 * @param props.plannedCounts How many copies of each template the slot holds.
 * @param props.emptyTitle Heading shown when `meals` is empty.
 */
export function MealPicker({
  meals,
  remainingCalories,
  formAction,
  pending,
  formError,
  fields,
  rowLabel,
  plannedCounts,
  emptyTitle = "Your meal library is empty",
}: {
  meals: Meal[];
  remainingCalories: number;
  formAction: (formData: FormData) => void;
  pending: boolean;
  formError?: string;
  fields: (meal: Meal) => Record<string, string>;
  rowLabel: (meal: Meal) => string;
  plannedCounts?: Map<string, number>;
  emptyTitle?: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return needle
      ? meals.filter((meal) => meal.name.toLowerCase().includes(needle))
      : meals;
  }, [meals, query]);

  if (meals.length === 0) {
    return (
      <Empty className="py-6">
        <EmptyHeader>
          <EmptyTitle className={CARD_TITLE_CLASS}>{emptyTitle}</EmptyTitle>
          <EmptyDescription>Build a meal to start planning.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link
            href="/meals"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Build a meal
          </Link>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="grid gap-2">
      <InputGroup>
        <InputGroupAddon aria-hidden="true">
          <Search strokeWidth={ICON_STROKE} />
        </InputGroupAddon>
        <InputGroupInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search meals"
          aria-label="Search meals"
        />
      </InputGroup>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          No meals match that search.
        </p>
      ) : (
        <div className="max-h-72 overflow-y-auto">
          <ul className="grid min-w-0 gap-1">
            {filtered.map((meal) => {
              const totals = computeMealTotals(meal);
              const added = plannedCounts?.get(meal.id) ?? 0;
              const over = Math.round(totals.calories - remainingCalories);
              const macros = {
                protein: totals.protein,
                carbs: totals.carbs,
                fat: totals.fat,
              };

              return (
                <li key={meal.id} className="min-w-0">
                  <form action={formAction}>
                    {Object.entries(fields(meal)).map(([name, value]) => (
                      <input
                        key={name}
                        type="hidden"
                        name={name}
                        value={value}
                      />
                    ))}
                    <Button
                      type="submit"
                      variant="ghost"
                      disabled={pending}
                      aria-label={rowLabel(meal)}
                      className="h-auto w-full justify-between gap-3 py-2 text-left"
                    >
                      <span className="flex min-w-0 flex-col items-start">
                        <span
                          className="max-w-full truncate text-sm font-medium"
                          title={meal.name}
                        >
                          {meal.name}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-2 text-xs font-normal">
                          {MACRO_INITIALS.map(({ macro, initial }) => (
                            <span
                              key={macro}
                              className="inline-flex items-center gap-1"
                            >
                              <MacroDot macro={macro} />
                              {initial} {formatWhole(macros[macro])}
                            </span>
                          ))}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end font-normal">
                        <span className="text-sm">
                          {formatWhole(totals.calories)}
                          <span className="text-muted-foreground">
                            {THIN_SPACE}kcal
                          </span>
                        </span>
                        {added > 0 ? (
                          <span className="text-muted-foreground text-xs">
                            Added ×{added}
                          </span>
                        ) : null}
                        {over > 0 ? (
                          <span className="text-muted-foreground text-xs">
                            over by {over}
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

      {formError ? (
        <p role="alert" className="text-destructive text-sm">
          {formError}
        </p>
      ) : null}
    </div>
  );
}
