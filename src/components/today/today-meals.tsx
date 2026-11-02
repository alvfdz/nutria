"use client";

import { useTransition } from "react";

import Link from "next/link";

import { cn } from "cn";
import { ArrowLeftRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CARD_CLASS,
  CARD_TITLE_CLASS,
  ICON_STROKE,
  THIN_SPACE,
} from "@/lib/design-system";
import { formatWhole } from "@/lib/goals/display";
import type { PlannedMealView, SlotView } from "@/lib/plan/types";

/**
 * The DOM id of a meal's swap button, which anchors the picker and takes focus
 * back when it closes.
 *
 * @param planMealId Identifier of the plan row.
 * @returns A DOM id unique to the button.
 */
export function swapButtonId(planMealId: string): string {
  return `today-swap-${planMealId}`;
}

/**
 * The DOM id of a slot's add button, which anchors the picker and takes focus
 * back when it closes.
 *
 * @param slotId Identifier of the Goals slot.
 * @returns A DOM id unique to the button.
 */
export function addButtonId(slotId: string): string {
  return `today-add-${slotId}`;
}

/**
 * One planned meal: its tick, name, kcal and swap button. Each row has its own
 * transition, so a save only locks its own tick, and it stays focusable while
 * saving. An eaten meal goes muted, with no swap button to keep it from changing
 * by accident; the slot the button sat in stays reserved so the kcal line up.
 *
 * @param props.meal The planned meal.
 * @param props.activePickerId Id of the button whose picker is open, if any.
 * @param props.onToggle Saves a new tick state; resolves when it has settled.
 * @param props.onSwap Opens the swap picker for this meal.
 */
function MealRow({
  meal,
  activePickerId,
  onToggle,
  onSwap,
}: {
  meal: PlannedMealView;
  activePickerId: string | null;
  onToggle: (meal: PlannedMealView, eaten: boolean) => Promise<void>;
  onSwap: (meal: PlannedMealView) => void;
}) {
  const [pending, startTransition] = useTransition();
  const swapId = swapButtonId(meal.id);

  return (
    <li className="flex min-w-0 items-center gap-2">
      <label className="flex min-h-8 min-w-0 flex-1 cursor-pointer items-center gap-3">
        <Checkbox
          checked={meal.eaten}
          readOnly={pending}
          onCheckedChange={(checked) => {
            startTransition(() => onToggle(meal, checked));
          }}
        />
        <span
          title={meal.name}
          className={cn(
            "min-w-0 flex-1 truncate text-sm",
            meal.eaten && "text-muted-foreground",
          )}
        >
          {meal.name}
        </span>
      </label>
      <span className="text-sm whitespace-nowrap">
        {formatWhole(meal.totals.calories)}
        <span className="text-muted-foreground">{THIN_SPACE}kcal</span>
      </span>
      {meal.eaten ? (
        <span aria-hidden="true" className="size-8 shrink-0" />
      ) : (
        <Button
          type="button"
          id={swapId}
          variant="ghost"
          size="icon"
          aria-label={`Swap ${meal.name}`}
          aria-haspopup="dialog"
          aria-expanded={activePickerId === swapId}
          onClick={() => onSwap(meal)}
          className="text-muted-foreground shrink-0"
        >
          <ArrowLeftRight strokeWidth={ICON_STROKE} />
        </Button>
      )}
    </li>
  );
}

/**
 * The day's meals, slot by slot in dining order. Each planned meal gets its own
 * row and tick, even when a template is planned twice, because each serving is
 * eaten separately.
 *
 * @param props.slots The day's slots.
 * @param props.activePickerId Id of the button whose picker is open, if any.
 * @param props.onToggle Saves a meal's new tick state.
 * @param props.onSwap Opens the swap picker for a meal.
 * @param props.onAdd Opens the add picker for a slot.
 * @param props.className Extra classes for the card, used to place it.
 */
export function TodayMeals({
  slots,
  activePickerId,
  onToggle,
  onSwap,
  onAdd,
  className,
}: {
  slots: SlotView[];
  activePickerId: string | null;
  onToggle: (meal: PlannedMealView, eaten: boolean) => Promise<void>;
  onSwap: (slot: SlotView, meal: PlannedMealView) => void;
  onAdd: (slot: SlotView) => void;
  className?: string;
}) {
  const nothingPlanned = slots.every((slot) => slot.meals.length === 0);

  return (
    <Card className={cn(CARD_CLASS, className)}>
      <CardHeader>
        <CardTitle className={CARD_TITLE_CLASS}>
          <h2>Meals</h2>
        </CardTitle>
        {nothingPlanned ? (
          <CardDescription>
            Nothing planned today. Add a meal here, or{" "}
            <Link
              href="/calendar"
              className="text-foreground underline underline-offset-4"
            >
              plan it on the calendar
            </Link>
            .
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        <ul className="divide-border-subtle grid divide-y">
          {slots.map((slot) => {
            const addId = addButtonId(slot.id);

            return (
              <li
                key={slot.id}
                className="grid min-w-0 gap-1 py-3 first:pt-0 last:pb-0"
              >
                <h3
                  title={slot.name}
                  className="text-muted-foreground truncate text-sm font-medium"
                >
                  {slot.name}
                </h3>
                {slot.meals.length > 0 ? (
                  <ul className="grid min-w-0 gap-1">
                    {slot.meals.map((meal) => (
                      <MealRow
                        key={meal.id}
                        meal={meal}
                        activePickerId={activePickerId}
                        onToggle={onToggle}
                        onSwap={(chosen) => onSwap(slot, chosen)}
                      />
                    ))}
                  </ul>
                ) : null}
                <div>
                  <Button
                    type="button"
                    id={addId}
                    variant="ghost"
                    aria-label={`Add a meal to ${slot.name}`}
                    aria-haspopup="dialog"
                    aria-expanded={activePickerId === addId}
                    onClick={() => onAdd(slot)}
                    className="text-muted-foreground -ml-2"
                  >
                    <Plus
                      data-icon="inline-start"
                      strokeWidth={ICON_STROKE}
                      className="text-brand"
                    />
                    Add meal
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
