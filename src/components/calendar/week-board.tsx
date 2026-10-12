import { cn } from "cn";

import type { MacroBudget, SlotBudget } from "@/lib/goals/budget";
import { formatMacro } from "@/lib/ingredients/format";

/** One Goals slot as a day column renders it: name, share and target. */
export type DaySlot = {
  /** Slot name, e.g. "Breakfast". */
  name: string;
  /** Share of the day's budget, 0–100. */
  percent: number;
  /** The slot's target budget. */
  target: SlotBudget;
};

/** One day of the week as the board renders it. */
export type DayColumn = {
  /** The day's date key, `YYYY-MM-DD`. */
  date: string;
  /** Short label, e.g. "Mon 13". */
  label: string;
  /** Whether this column is today. */
  isToday: boolean;
  /** The day's target budget, or null when no goals are set. */
  budget: MacroBudget | null;
  /** One row per Goals slot, in dining order. */
  slots: DaySlot[];
};

/** Classes shared by the header and body cells of a day column. */
const DAY_CELL = "border-border border-l px-3 py-2 align-top text-left";

/** Extra shading that marks today's column. */
const TODAY_CELL = "bg-muted/40";

/**
 * The day header's target line: what is planned against the target, for all
 * four numbers. Nothing is planned in this read-only shell, so the planned
 * half is always zero; plan 2 fills it in. Renders a placeholder when the day
 * has no budget to compare against.
 *
 * @param props.budget The day's target budget, or null without goals.
 */
function DayTarget({ budget }: { budget: MacroBudget | null }) {
  if (!budget) {
    return (
      <span className="text-muted-foreground block text-xs font-normal">
        No target set
      </span>
    );
  }

  return (
    <span className="text-muted-foreground block text-xs font-normal tabular-nums">
      <span className="block">
        {formatMacro(0)} / {formatMacro(budget.calories)} kcal
      </span>
      <span className="block">
        P {formatMacro(0)}/{formatMacro(budget.proteinGrams)} · C{" "}
        {formatMacro(0)}/{formatMacro(budget.carbsGrams)} · F {formatMacro(0)}/
        {formatMacro(budget.fatGrams)}
      </span>
    </span>
  );
}

/**
 * The week board: the selected Monday → Sunday as a table of the user's Goals
 * slots. Slots are rows and days are columns, so one day reads as a column and
 * the same slot lines up across the week for comparison. Read-only for now —
 * every cell is an empty placeholder. A wide table scrolls inside its wrapper
 * rather than squeezing the columns.
 *
 * @param props.days The seven day columns, Monday first.
 */
export function WeekBoard({ days }: { days: DayColumn[] }) {
  const slots = days[0]?.slots ?? [];

  return (
    <div className="ring-foreground/10 overflow-x-auto rounded-xl ring-1">
      <table className="w-full min-w-[52rem] border-collapse text-sm">
        <caption className="sr-only">
          Planned meals for the week, one row per meal slot and one column per
          day, Monday to Sunday.
        </caption>
        <thead>
          <tr className="border-border border-b">
            <th
              scope="col"
              className="text-muted-foreground px-3 py-2 text-left text-xs font-medium"
            >
              Meal
            </th>
            {days.map((day) => (
              <th
                key={day.date}
                scope="col"
                data-today={day.isToday ? "true" : undefined}
                className={cn(
                  DAY_CELL,
                  "font-medium whitespace-nowrap",
                  day.isToday && TODAY_CELL,
                )}
              >
                <span className="block">{day.label}</span>
                <DayTarget budget={day.budget} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot, slotIndex) => (
            <tr
              key={slot.name}
              className="border-border border-b last:border-0"
            >
              <th
                scope="row"
                className="px-3 py-2 text-left align-top font-medium"
              >
                <span className="block">{slot.name}</span>
                <span className="text-muted-foreground block text-xs font-normal tabular-nums">
                  {formatMacro(slot.target.calories)} kcal · P{" "}
                  {formatMacro(slot.target.proteinGrams)} g · C{" "}
                  {formatMacro(slot.target.carbsGrams)} g · F{" "}
                  {formatMacro(slot.target.fatGrams)} g
                </span>
              </th>

              {days.map((day) => (
                <td
                  key={day.date}
                  data-today={day.isToday ? "true" : undefined}
                  className={cn(
                    DAY_CELL,
                    "min-w-40",
                    day.isToday && TODAY_CELL,
                  )}
                >
                  {day.slots[slotIndex] ? (
                    <span className="text-muted-foreground text-xs">
                      Nothing planned
                    </span>
                  ) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
