import { cn } from "cn";

import { SlotCard, slotCardId } from "@/components/calendar/slot-card";
import { formatMacro } from "@/lib/ingredients/format";
import type { DayColumn as DayColumnData, SlotView } from "@/lib/plan/types";

/**
 * One day of the week: its header (weekday, day number, planned kcal against
 * target, and a kcal-only progress track) above a stack of slot cards. Today
 * is marked by a ring and a filled day number; days before today are muted and
 * render no controls.
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
  const plannedPercent = targetCalories
    ? Math.min(100, Math.max(0, (day.planned.calories / targetCalories) * 100))
    : 0;

  return (
    <div
      data-today={day.isToday ? "true" : undefined}
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-3",
        day.isToday && "border-ring ring-ring/40 ring-1",
        !day.isEditable && "opacity-60",
      )}
    >
      <header className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {day.weekday}
          </span>
          <span
            aria-current={day.isToday ? "date" : undefined}
            className={cn(
              "flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
              day.isToday
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground",
            )}
          >
            {day.dayOfMonth}
          </span>
        </div>

        <span className="text-muted-foreground text-xs tabular-nums">
          {formatMacro(day.planned.calories)} / {formatMacro(targetCalories)}{" "}
          kcal
        </span>

        <div
          aria-hidden="true"
          className="bg-muted h-1 overflow-hidden rounded-full"
        >
          <div
            className="bg-primary h-full rounded-full"
            style={{ width: `${plannedPercent}%` }}
          />
        </div>
      </header>

      <div className="flex flex-col gap-2">
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
    </div>
  );
}
