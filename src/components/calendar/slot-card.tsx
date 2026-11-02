import { cn } from "cn";
import { Plus } from "lucide-react";

import { formatDayLabel } from "@/lib/calendar/week";
import { ICON_STROKE } from "@/lib/design-system";
import { formatWhole } from "@/lib/goals/display";
import { groupPlannedMeals, overLabel } from "@/lib/plan/rollup";
import type { SlotView } from "@/lib/plan/types";

/**
 * The stable DOM id of a slot card. The board uses it to anchor the food panel
 * to the card and to return focus to it on close, so both sides compute it the
 * same way.
 *
 * @param date The day's key, `YYYY-MM-DD`.
 * @param slotId Identifier of the Goals slot.
 * @returns A DOM id unique to the card.
 */
export function slotCardId(date: string, slotId: string): string {
  return `slot-card-${date}-${slotId}`;
}

/**
 * One food (meal slot) of one day on the board. It carries only what the week
 * is scanned for: the food's name, its planned calories against the target, and
 * one row per planned meal. A meal row shows its calories only when the card has
 * several rows; a lone row's calories are the total already in the card's header.
 * Guidance and editing live in the food panel the card opens.
 *
 * A planned card carries more weight than an empty one, so the week's content
 * stands out from its gaps. When the day is editable the whole card is a button
 * that opens the panel, and an empty card says so with "Add meal"; on a past day
 * it is a plain block with nothing focusable.
 *
 * @param props.date The day's key, used in the accessible name and the id.
 * @param props.slot The slot view to render.
 * @param props.editable Whether the day can still be planned.
 * @param props.open Whether this card's panel is currently open.
 * @param props.onOpen Opens the food panel for this slot.
 */
export function SlotCard({
  date,
  slot,
  editable,
  open,
  onOpen,
}: {
  date: string;
  slot: SlotView;
  editable: boolean;
  open: boolean;
  onOpen: () => void;
}) {
  const isEmpty = slot.meals.length === 0;
  const over = overLabel(slot.totals.calories, slot.target.calories);
  const groups = groupPlannedMeals(slot.meals);

  const inner = (
    <>
      <span className="flex items-center justify-between gap-2 text-xs">
        <span
          className="text-muted-foreground min-w-0 truncate font-medium"
          title={slot.name}
        >
          {slot.name}
        </span>
        <span className="sr-only">, {formatDayLabel(date)}: </span>
        {isEmpty ? (
          <span className="text-muted-foreground shrink-0">
            {formatWhole(slot.target.calories)}
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1">
            {over ? (
              <span
                aria-hidden="true"
                className="inline-block -translate-y-0.5 leading-none"
              >
                ▲
              </span>
            ) : null}
            <span>
              <span className={cn(over && "text-foreground font-semibold")}>
                {formatWhole(slot.totals.calories)}
              </span>
              <span className="text-muted-foreground">
                /{formatWhole(slot.target.calories)}
              </span>
            </span>
          </span>
        )}
        <span className="sr-only"> kcal. </span>
      </span>

      {isEmpty ? (
        editable ? (
          <span className="text-muted-foreground flex items-center gap-1 text-xs leading-5">
            <Plus
              aria-hidden="true"
              strokeWidth={ICON_STROKE}
              className="group-hover:text-brand group-focus-visible:text-brand size-4 shrink-0"
            />
            Add meal
          </span>
        ) : (
          <span className="text-muted-foreground text-xs leading-5">
            Nothing planned
          </span>
        )
      ) : (
        <span className="grid min-w-0 gap-0.5">
          {groups.map((group) => {
            const label =
              group.count > 1 ? `${group.name} ×${group.count}` : group.name;

            return (
              <span
                key={group.mealId}
                className="flex min-w-0 items-baseline gap-1"
              >
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm leading-5",
                    !editable && "text-muted-foreground",
                  )}
                  title={label}
                >
                  {label}
                </span>
                {groups.length > 1 ? (
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {formatWhole(group.calories)}
                  </span>
                ) : null}
              </span>
            );
          })}
        </span>
      )}

      {over ? <span className="sr-only">, {over}</span> : null}
    </>
  );

  const classes = cn(
    "flex w-full flex-col gap-2 rounded-lg border p-3 text-left",
    isEmpty ? "border-border-subtle" : "border-border",
    !isEmpty && editable && "bg-muted/50",
  );

  if (!editable) {
    return <div className={classes}>{inner}</div>;
  }

  return (
    <button
      type="button"
      id={slotCardId(date, slot.id)}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={onOpen}
      className={cn(
        classes,
        "group focus-visible:border-ring focus-visible:ring-ring/50 cursor-pointer outline-none focus-visible:ring-3",
        isEmpty ? "hover:bg-muted/50" : "hover:border-ring",
        open && "border-ring",
      )}
    >
      {inner}
    </button>
  );
}
