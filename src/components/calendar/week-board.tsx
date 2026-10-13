"use client";

import { useActionState, useCallback, useState } from "react";

import { removeMealAction } from "@/app/calendar/actions";
import { AssignMealDialog } from "@/components/calendar/assign-meal-dialog";
import { DayColumn } from "@/components/calendar/day-column";
import type { Meal } from "@/lib/meals/types";
import {
  initialRemoveMealState,
  type RemoveMealState,
} from "@/lib/plan/form-state";
import type { DayColumn as DayColumnData, SlotView } from "@/lib/plan/types";

/** The slot a dialog is currently filling, with where to return focus. */
type AssignTarget = {
  /** The day's key, `YYYY-MM-DD`. */
  date: string;
  /** The slot view being filled. */
  slot: SlotView;
  /** Id of the "Add meal" button that opened the dialog. */
  addButtonId: string;
};

/**
 * The week board: seven independent day columns, Monday to Sunday. Each column
 * is its own vertical agenda — no shared rows, no matching card heights — so
 * the week reads as a week rather than a table. Owns the assign dialog and the
 * screen-reader live region for add and remove outcomes.
 *
 * @param props.days The seven day columns, Monday first.
 * @param props.meals The meal library offered by the assign dialog.
 */
export function WeekBoard({
  days,
  meals,
}: {
  days: DayColumnData[];
  meals: Meal[];
}) {
  const [assigning, setAssigning] = useState<AssignTarget | null>(null);
  const [announcement, setAnnouncement] = useState("");

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

  const handleAdd = useCallback(
    (date: string, slot: SlotView, addButtonId: string) => {
      setAssigning({ date, slot, addButtonId });
    },
    [],
  );

  const handleAssigned = useCallback((name: string) => {
    setAnnouncement(`${name} added to your plan.`);
  }, []);

  const closeAssign = useCallback(() => {
    const triggerId = assigning?.addButtonId;
    setAssigning(null);
    if (triggerId) {
      document.getElementById(triggerId)?.focus();
    }
  }, [assigning]);

  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto pb-1">
        <div className="grid w-full grid-cols-[repeat(7,minmax(11rem,1fr))] gap-3">
          {days.map((day) => (
            <DayColumn
              key={day.date}
              day={day}
              onAdd={handleAdd}
              removeAction={removeFormAction}
              removePending={removePending}
            />
          ))}
        </div>
      </div>

      {assigning ? (
        <AssignMealDialog
          key={`${assigning.date}-${assigning.slot.id}`}
          date={assigning.date}
          slot={assigning.slot}
          meals={meals}
          onClose={closeAssign}
          onAssigned={handleAssigned}
        />
      ) : null}

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
