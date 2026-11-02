import { cn } from "cn";

import { SlotCard, slotCardId } from "@/components/calendar/slot-card";
import { formatDayLabel } from "@/lib/calendar/week";
import { THIN_SPACE } from "@/lib/design-system";
import { formatWhole } from "@/lib/goals/display";
import { calorieStateLabel, macroState, stateMarker } from "@/lib/plan/rollup";
import type { DayColumn as DayColumnData, SlotView } from "@/lib/plan/types";

/**
 * One day of the week: its header (weekday, day number, planned kcal against
 * target with a state marker, and a kcal-only progress track) above a stack of
 * slot cards. From the `xl` breakpoint it spans one board row per header and
 * slot and takes them through subgrid, so slots line up across the week. Today
 * is marked by its border and a filled day number; days before today sit on the
 * page background and render no controls.
 *
 * @param props.day The day column data.
 * @param props.activeCardId Id of the card whose panel is open, if any.
 * @param props.onOpen Opens the food panel for one of the day's slots.
 */
export function DayColumn({
  day,
  activeCardId,
  onOpen,
}: {
  day: DayColumnData;
  activeCardId: string | null;
  onOpen: (date: string, slot: SlotView, cardId: string) => void;
}) {
  const targetCalories = day.budget?.calories ?? 0;
  const plannedCalories = day.planned.calories;
  const plannedPercent = targetCalories
    ? Math.min(100, Math.max(0, (plannedCalories / targetCalories) * 100))
    : 0;
  const isMet = macroState(plannedCalories, targetCalories).state === "met";

  return (
    <section
      aria-label={formatDayLabel(day.date)}
      data-today={day.isToday ? "true" : undefined}
      // Only read once the board is a grid, at `xl`; a stacked day ignores it.
      style={{ gridRow: `span ${day.slots.length + 1}` }}
      className={cn(
        "rounded-card flex flex-col gap-2 border p-2 xl:grid xl:grid-rows-subgrid",
        day.isEditable ? "bg-card" : "bg-transparent",
        day.isToday && "border-ring",
      )}
    >
      <header className="grid content-start gap-2 p-1">
        <h2 className="flex items-center gap-1.5 text-sm font-medium">
          <span className={cn(!day.isEditable && "text-muted-foreground")}>
            {day.weekday}
          </span>
          <span
            aria-current={day.isToday ? "date" : undefined}
            className={cn(
              "flex size-6 items-center justify-center rounded-full",
              day.isToday
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground",
            )}
          >
            {day.dayOfMonth}
          </span>
        </h2>

        <p className="flex items-baseline justify-between gap-2 text-xs">
          <span className="min-w-0">
            <span data-slot="day-planned">{formatWhole(plannedCalories)}</span>
            <span className="text-muted-foreground">
              /{formatWhole(targetCalories)}
              {THIN_SPACE}kcal
            </span>
          </span>
          {plannedCalories > 0 ? (
            <>
              <span
                aria-hidden="true"
                data-slot="day-marker"
                className={cn(
                  "shrink-0",
                  isMet ? "text-brand" : "text-muted-foreground",
                )}
              >
                {stateMarker(plannedCalories, targetCalories)}
              </span>
              <span className="sr-only">
                , {calorieStateLabel(plannedCalories, targetCalories)}
              </span>
            </>
          ) : null}
        </p>

        <div
          aria-hidden="true"
          className="bg-muted h-1.5 overflow-hidden rounded-full"
        >
          <div
            className="bg-primary h-full rounded-full"
            style={{ width: `${plannedPercent}%` }}
          />
        </div>
      </header>

      <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] xl:contents">
        {day.slots.map((slot) => {
          const cardId = slotCardId(day.date, slot.id);

          return (
            <SlotCard
              key={slot.id}
              date={day.date}
              slot={slot}
              editable={day.isEditable}
              open={activeCardId === cardId}
              onOpen={() => onOpen(day.date, slot, cardId)}
            />
          );
        })}
      </div>
    </section>
  );
}
