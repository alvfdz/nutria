"use client";

import { useCallback, useMemo, useOptimistic, useRef, useState } from "react";

import { cn } from "cn";
import { X } from "lucide-react";

import { setMealEatenAction } from "@/app/(app)/actions";
import { AddMealPicker } from "@/components/add-meal-picker";
import { SwapMealPicker } from "@/components/today/swap-meal-picker";
import { StickyKcalLeft, TodayBudget } from "@/components/today/today-budget";
import {
  addButtonId,
  swapButtonId,
  TodayMeals,
} from "@/components/today/today-meals";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverClose,
  PopoverPopup,
  PopoverPortal,
  PopoverPositioner,
  PopoverTitle,
} from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";
import {
  CARD_TITLE_CLASS,
  ICON_STROKE,
  OVERLAY_THEME_CLASS,
} from "@/lib/design-system";
import type { Meal } from "@/lib/meals/types";
import { initialSetMealEatenState } from "@/lib/plan/form-state";
import { summarizeDay, withMealEaten } from "@/lib/plan/today";
import type { DayColumn, PlannedMealView, SlotView } from "@/lib/plan/types";

/** What the open picker does, and the button that opened it. */
type ActivePicker = {
  /** Identifier of the slot it acts on. */
  slotId: string;
  /** The plan row being swapped; absent when adding to the slot. */
  planMealId?: string;
  /** Id of the button it's anchored to and returns focus to. */
  triggerId: string;
};

/**
 * The interactive part of the Today page: the day's meals, its budget, and the
 * one picker for adding or swapping a meal. A tick shows and moves the budget
 * straight away, then rolls back with a toast if the save fails.
 *
 * The open picker's slot and meal are derived from the current `day` on every
 * render, so a `refresh()` leaves fresh numbers in a picker that stays open.
 *
 * @param props.day Today, as the server last saw it.
 * @param props.meals The meal library offered by the pickers.
 */
export function TodayBoard({ day, meals }: { day: DayColumn; meals: Meal[] }) {
  const [optimisticDay, applyTick] = useOptimistic(
    day,
    (current, tick: { id: string; eaten: boolean }) =>
      withMealEaten(current, tick.id, tick.eaten),
  );
  const [active, setActive] = useState<ActivePicker | null>(null);
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const lastTriggerId = useRef<string | null>(null);

  const summary = summarizeDay(optimisticDay);

  const openPicker = useCallback((picker: ActivePicker) => {
    lastTriggerId.current = picker.triggerId;
    setActive(picker);
    setOpen(true);
  }, []);

  const handleToggle = useCallback(
    async (meal: PlannedMealView, eaten: boolean) => {
      applyTick({ id: meal.id, eaten });

      const formData = new FormData();
      formData.set("planMealId", meal.id);
      formData.set("eaten", String(eaten));

      let formError: string | undefined;

      try {
        ({ formError } = await setMealEatenAction(
          initialSetMealEatenState,
          formData,
        ));
      } catch {
        formError = "The meal could not be updated. Please try again.";
      }

      if (formError) {
        toast.add({ type: "error", title: formError });
        setAnnouncement(formError);
      } else {
        setAnnouncement(
          eaten ? `${meal.name} marked as eaten.` : `${meal.name} unticked.`,
        );
      }
    },
    [applyTick],
  );

  const handleAssigned = useCallback((name: string) => {
    setAnnouncement(`${name} added to today.`);
  }, []);

  const handleSwapped = useCallback((name: string) => {
    setAnnouncement(`Swapped to ${name}.`);
    setOpen(false);
  }, []);

  const { activeSlot, activeMeal } = useMemo(() => {
    const slot: SlotView | null =
      optimisticDay.slots.find(
        (candidate) => candidate.id === active?.slotId,
      ) ?? null;
    const meal =
      slot?.meals.find((candidate) => candidate.id === active?.planMealId) ??
      null;

    return { activeSlot: slot, activeMeal: meal };
  }, [active, optimisticDay]);

  // Swapping a meal needs that meal: a picker whose row just vanished closes.
  const canShowPicker =
    activeSlot !== null &&
    (active?.planMealId === undefined || activeMeal !== null);

  // The ref keeps the id after `active` clears, because the popup unmounts
  // after React has already dropped that state.
  const finalFocus = useCallback(
    () =>
      lastTriggerId.current
        ? document.getElementById(lastTriggerId.current)
        : null,
    [],
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
      <TodayBudget
        summary={summary}
        budget={optimisticDay.budget}
        className="lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1"
      />

      <div className="grid min-w-0 lg:col-start-1 lg:row-start-1">
        <StickyKcalLeft caloriesLeft={summary.caloriesLeft} />
        <TodayMeals
          slots={optimisticDay.slots}
          activePickerId={open ? (active?.triggerId ?? null) : null}
          onToggle={handleToggle}
          onSwap={(slot, meal) =>
            openPicker({
              slotId: slot.id,
              planMealId: meal.id,
              triggerId: swapButtonId(meal.id),
            })
          }
          onAdd={(slot) =>
            openPicker({ slotId: slot.id, triggerId: addButtonId(slot.id) })
          }
        />
      </div>

      <Popover
        open={open && canShowPicker}
        onOpenChange={setOpen}
        onOpenChangeComplete={(nextOpen) => {
          if (!nextOpen) {
            setActive(null);
            setOpen(false);
          }
        }}
        triggerId={active?.triggerId ?? null}
      >
        <PopoverPortal>
          <PopoverPositioner
            anchor={
              active
                ? () => document.getElementById(active.triggerId)
                : undefined
            }
            positionMethod="fixed"
            side="bottom"
            align="end"
            sideOffset={8}
            collisionPadding={16}
            collisionAvoidance={{ side: "flip", align: "shift" }}
          >
            <PopoverPopup
              finalFocus={finalFocus}
              className={cn(
                OVERLAY_THEME_CLASS,
                "rounded-card! max-h-[min(var(--available-height),40rem)] w-[min(21.5rem,calc(100vw-2rem))] overflow-y-auto p-4",
              )}
            >
              {activeSlot ? (
                <div className="grid gap-3">
                  <header className="flex min-w-0 items-start justify-between gap-2">
                    <PopoverTitle
                      className={cn("min-w-0 truncate", CARD_TITLE_CLASS)}
                      title={activeMeal?.name ?? activeSlot.name}
                    >
                      {activeMeal
                        ? `Swap ${activeMeal.name}`
                        : `Add to ${activeSlot.name}`}
                    </PopoverTitle>
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
                  {activeMeal ? (
                    <SwapMealPicker
                      key={activeMeal.id}
                      slot={activeSlot}
                      meal={activeMeal}
                      meals={meals}
                      onSwapped={handleSwapped}
                    />
                  ) : (
                    <AddMealPicker
                      key={activeSlot.id}
                      date={optimisticDay.date}
                      slot={activeSlot}
                      meals={meals}
                      onAssigned={handleAssigned}
                    />
                  )}
                </div>
              ) : null}
            </PopoverPopup>
          </PopoverPositioner>
        </PopoverPortal>
      </Popover>

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
