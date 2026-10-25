"use client";

import { useActionState, useCallback, useMemo, useRef, useState } from "react";

import { removeMealAction } from "@/app/(app)/calendar/actions";
import { DayColumn } from "@/components/calendar/day-column";
import { FoodPanel } from "@/components/calendar/food-panel";
import {
  Popover,
  PopoverPortal,
  PopoverPositioner,
  PopoverPopup,
} from "@/components/ui/popover";
import type { Meal } from "@/lib/meals/types";
import {
  initialRemoveMealState,
  type RemoveMealState,
} from "@/lib/plan/form-state";
import type { DayColumn as DayColumnData, SlotView } from "@/lib/plan/types";

/** Which food's panel is open: where it lives and which card anchors it. */
type ActiveFood = {
  /** The day's key, `YYYY-MM-DD`. */
  date: string;
  /** Identifier of the Goals slot. */
  slotId: string;
  /** Id of the card the panel is anchored to and returns focus to. */
  cardId: string;
};

/**
 * The week board: seven independent day columns, Monday to Sunday. Each column
 * is its own vertical agenda — no shared rows, no matching card heights — so
 * the week reads as a week rather than a table. Owns the one food panel, the
 * shared remove form action, and the screen-reader live region for add and
 * remove outcomes.
 *
 * The open panel is anchored to the card that opened it. Its food is derived
 * from the current `days` on every render rather than frozen when it opened, so
 * a `refresh()` after an add or a remove leaves fresh totals in a panel that
 * stays open.
 *
 * @param props.days The seven day columns, Monday first.
 * @param props.meals The meal library offered by the panel's picker.
 */
export function WeekBoard({
  days,
  meals,
}: {
  days: DayColumnData[];
  meals: Meal[];
}) {
  const [active, setActive] = useState<ActiveFood | null>(null);
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const lastCardId = useRef<string | null>(null);

  // The board announces the remove outcome itself rather than through an
  // effect: the action runs on submit, so the message is set where the result
  // arrives and a later add is never masked by a stale remove.
  const [, removeFormAction, removePending] = useActionState(
    async (
      previousState: RemoveMealState,
      formData: FormData,
    ): Promise<RemoveMealState> => {
      const state = await removeMealAction(previousState, formData);

      if (state.status === "success" && state.removedName) {
        setAnnouncement(`${state.removedName} removed from your plan.`);
      } else if (state.status === "error" && state.formError) {
        setAnnouncement(state.formError);
      }

      return state;
    },
    initialRemoveMealState,
  );

  const handleOpen = useCallback(
    (date: string, slot: SlotView, cardId: string) => {
      lastCardId.current = cardId;
      setActive({ date, slotId: slot.id, cardId });
      setOpen(true);
    },
    [],
  );

  const handleAssigned = useCallback((name: string) => {
    setAnnouncement(`${name} added to your plan.`);
  }, []);

  const activeSlot = useMemo(() => {
    if (!active) return null;

    return (
      days
        .find((day) => day.date === active.date)
        ?.slots.find((slot) => slot.id === active.slotId) ?? null
    );
  }, [active, days]);

  // A card the panel is anchored to is the element focus returns to. The ref
  // holds the id even after `active` is cleared, because the popup unmounts
  // after React has already dropped the state.
  const finalFocus = useCallback(
    () =>
      lastCardId.current ? document.getElementById(lastCardId.current) : null,
    [],
  );

  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto pb-1">
        <div className="grid w-full grid-cols-[repeat(7,minmax(11rem,1fr))] gap-3">
          {days.map((day) => (
            <DayColumn
              key={day.date}
              day={day}
              activeCardId={active?.cardId ?? null}
              onOpen={handleOpen}
            />
          ))}
        </div>
      </div>

      <Popover
        open={open && activeSlot !== null}
        onOpenChange={setOpen}
        onOpenChangeComplete={(nextOpen) => {
          if (!nextOpen) {
            setActive(null);
            setOpen(false);
          }
        }}
        triggerId={active?.cardId ?? null}
      >
        <PopoverPortal>
          <PopoverPositioner
            anchor={
              active ? () => document.getElementById(active.cardId) : undefined
            }
            positionMethod="fixed"
            side="right"
            align="start"
            sideOffset={8}
            collisionAvoidance={{ side: "flip", align: "shift" }}
          >
            <PopoverPopup
              finalFocus={finalFocus}
              className="max-h-[min(80vh,40rem)] w-86 overflow-y-auto rounded-xl p-4"
            >
              {activeSlot ? (
                <FoodPanel
                  date={active?.date ?? ""}
                  slot={activeSlot}
                  meals={meals}
                  removeAction={removeFormAction}
                  removePending={removePending}
                  onAssigned={handleAssigned}
                />
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
