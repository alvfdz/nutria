"use client";

import { useState } from "react";

import { cn } from "cn";
import { ChevronRight, Plus, X } from "lucide-react";

import { AddMealPicker } from "@/components/calendar/add-meal-picker";
import { MacroBars } from "@/components/calendar/macro-bars";
import { Button } from "@/components/ui/button";
import {
  PopoverClose,
  PopoverDescription,
  PopoverTitle,
} from "@/components/ui/popover";
import { formatDayLabel } from "@/lib/calendar/week";
import { formatMacro } from "@/lib/ingredients/format";
import type { Meal } from "@/lib/meals/types";
import type { SlotView } from "@/lib/plan/types";

/**
 * The anchored panel for one food. Its header names the food and reads the day
 * and the food's kcal against target; its bars carry the macro guidance; its
 * meal rows expand to the ingredients and offer removal; and its footer reveals
 * the picker for adding another meal. It renders inside a base-ui popup, so its
 * close button and focus behaviour come from that popup.
 *
 * @param props.date The day's key, `YYYY-MM-DD`.
 * @param props.slot The food to render, as the board currently sees it.
 * @param props.meals The whole meal library offered by the picker.
 * @param props.removeAction The board's shared remove form action.
 * @param props.removePending Whether a remove is in flight.
 * @param props.onAssigned Called with the added meal's name to announce.
 */
export function FoodPanel({
  date,
  slot,
  meals,
  removeAction,
  removePending,
  onAssigned,
}: {
  date: string;
  slot: SlotView;
  meals: Meal[];
  removeAction: (formData: FormData) => void;
  removePending: boolean;
  onAssigned: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const isEmpty = slot.meals.length === 0;

  const toggleMeal = (id: string) => {
    setExpanded((previous) => {
      const next = new Set(previous);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  return (
    <div className="grid gap-4">
      <header className="flex items-start justify-between gap-2">
        <div className="grid gap-0.5">
          <PopoverTitle className="text-base font-medium">
            {slot.name}
          </PopoverTitle>
          <PopoverDescription className="text-xs tabular-nums">
            {formatDayLabel(date)} ·{" "}
            <span className="text-foreground font-medium">
              {formatMacro(slot.totals.calories)}
            </span>
            {" / "}
            {formatMacro(slot.target.calories)} kcal
          </PopoverDescription>
        </div>
        <PopoverClose
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="-mt-1 -mr-1 shrink-0"
            />
          }
        >
          <X />
          <span className="sr-only">Close</span>
        </PopoverClose>
      </header>

      {isEmpty ? null : <MacroBars totals={slot.totals} target={slot.target} />}

      <section className="grid gap-2">
        <h3 className="text-muted-foreground text-[0.6rem] font-semibold tracking-wide uppercase">
          Meals in this food
        </h3>

        {isEmpty ? (
          <p className="text-muted-foreground text-sm">Nothing planned yet</p>
        ) : (
          <form action={removeAction} className="grid gap-2">
            {slot.meals.map((meal) => {
              const isExpanded = expanded.has(meal.id);

              return (
                <div
                  key={meal.id}
                  className="grid gap-1.5 rounded-lg border p-1.5"
                >
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => toggleMeal(meal.id)}
                      className="hover:bg-muted focus-visible:ring-ring/50 flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1 py-0.5 text-left outline-none focus-visible:ring-2"
                    >
                      <ChevronRight
                        aria-hidden="true"
                        className={cn(
                          "text-muted-foreground size-3.5 shrink-0 transition-transform",
                          isExpanded && "rotate-90",
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {meal.name}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                        {formatMacro(meal.totals.calories)}
                      </span>
                    </button>
                    <Button
                      type="submit"
                      name="planMealId"
                      value={meal.id}
                      variant="ghost"
                      size="icon-xs"
                      disabled={removePending}
                      aria-label={`Remove ${meal.name} from ${slot.name}`}
                    >
                      <X />
                    </Button>
                  </div>

                  {isExpanded ? (
                    <ul className="grid gap-0.5 border-t pt-1.5">
                      {meal.items.map((item) => (
                        <li
                          key={item.id}
                          className="text-muted-foreground flex items-baseline gap-2 text-xs"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {item.name}
                          </span>
                          <span className="tabular-nums">
                            {formatMacro(item.grams)} g
                          </span>
                          <span className="w-12 text-right tabular-nums">
                            {formatMacro(item.calories)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </form>
        )}
      </section>

      <footer className="border-t pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((open) => !open)}
          className="w-full justify-start"
        >
          <Plus /> Add a meal
        </Button>

        {pickerOpen ? (
          <div className="mt-2">
            <AddMealPicker
              date={date}
              slot={slot}
              meals={meals}
              onAssigned={onAssigned}
            />
          </div>
        ) : null}
      </footer>
    </div>
  );
}
