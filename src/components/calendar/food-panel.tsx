"use client";

import { useState } from "react";

import { cn } from "cn";
import { ChevronRight, Plus, Trash2, X } from "lucide-react";

import { AddMealPicker } from "@/components/add-meal-picker";
import { MacroBars } from "@/components/macro-bars";
import { Button } from "@/components/ui/button";
import {
  PopoverClose,
  PopoverDescription,
  PopoverTitle,
} from "@/components/ui/popover";
import { formatDayLabel } from "@/lib/calendar/week";
import { CARD_TITLE_CLASS, ICON_STROKE, THIN_SPACE } from "@/lib/design-system";
import { formatWhole } from "@/lib/goals/display";
import { formatMacro } from "@/lib/ingredients/format";
import type { Meal } from "@/lib/meals/types";
import type { SlotView } from "@/lib/plan/types";

/**
 * The anchored panel for one food. Its header names the food and reads the day
 * and the food's kcal against target; its bars carry the macro guidance; its
 * meal rows expand to the ingredients and offer removal; and its footer reveals
 * the picker for adding another meal. An empty food has nothing else to do, so
 * it shows the picker straight away. It renders inside a base-ui popup, so its
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
      <header className="flex min-w-0 items-start justify-between gap-2">
        <div className="grid min-w-0 gap-0.5">
          <PopoverTitle
            className={cn("truncate", CARD_TITLE_CLASS)}
            title={slot.name}
          >
            {slot.name}
          </PopoverTitle>
          <PopoverDescription className="type-caption">
            {formatDayLabel(date)} ·{" "}
            <span className="text-foreground font-medium">
              {formatWhole(slot.totals.calories)}
            </span>
            /{formatWhole(slot.target.calories)}
            {THIN_SPACE}kcal
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
          <X strokeWidth={ICON_STROKE} />
          <span className="sr-only">Close</span>
        </PopoverClose>
      </header>

      {isEmpty ? null : <MacroBars totals={slot.totals} target={slot.target} />}

      {isEmpty ? null : (
        <section aria-label={`Meals in ${slot.name}`} className="grid min-w-0">
          <form
            action={removeAction}
            className="divide-border-subtle grid min-w-0 divide-y"
          >
            {slot.meals.map((meal) => {
              const isExpanded = expanded.has(meal.id);

              return (
                <div key={meal.id} className="grid min-w-0 gap-1.5 py-1.5">
                  <div className="flex min-w-0 items-center gap-1">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => toggleMeal(meal.id)}
                      className="hover:bg-muted focus-visible:ring-ring/50 flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1 py-1 text-left outline-none focus-visible:ring-3"
                    >
                      <ChevronRight
                        aria-hidden="true"
                        strokeWidth={ICON_STROKE}
                        className={cn(
                          "text-muted-foreground size-4 shrink-0 transition-transform",
                          isExpanded && "rotate-90",
                        )}
                      />
                      <span
                        className="min-w-0 flex-1 truncate text-sm"
                        title={meal.name}
                      >
                        {meal.name}
                      </span>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {formatWhole(meal.totals.calories)}
                      </span>
                    </button>
                    <Button
                      type="submit"
                      name="planMealId"
                      value={meal.id}
                      variant="ghost"
                      size="icon"
                      disabled={removePending}
                      aria-label={`Remove ${meal.name} from ${slot.name}`}
                    >
                      <Trash2 strokeWidth={ICON_STROKE} />
                    </Button>
                  </div>

                  {isExpanded ? (
                    <ul className="grid min-w-0 gap-0.5 pr-9 pl-6.5">
                      {meal.items.map((item) => (
                        <li
                          key={item.id}
                          className="text-muted-foreground flex min-w-0 items-baseline gap-2 text-xs"
                        >
                          <span
                            className="min-w-0 flex-1 truncate"
                            title={item.name}
                          >
                            {item.name}
                          </span>
                          <span>
                            {formatMacro(item.grams)}
                            {THIN_SPACE}g
                          </span>
                          <span className="w-10 text-right">
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
        </section>
      )}

      <footer className={cn(!isEmpty && "border-border-subtle border-t pt-2")}>
        {isEmpty ? null : (
          <Button
            type="button"
            variant="ghost"
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen((open) => !open)}
            className="w-full justify-start"
          >
            <Plus
              data-icon="inline-start"
              strokeWidth={ICON_STROKE}
              className="text-brand"
            />
            Add a meal
          </Button>
        )}

        {isEmpty || pickerOpen ? (
          <div className={cn(!isEmpty && "mt-2")}>
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
