import { cn } from "cn";

import { formatDayLabel } from "@/lib/calendar/week";
import { formatMacro } from "@/lib/ingredients/format";
import { overLabel } from "@/lib/plan/rollup";
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
 * one row per planned meal with its calories. Guidance and editing live in the
 * food panel the card opens.
 *
 * When the day is editable the whole card is a button that opens that panel;
 * on a past day it is a plain block with nothing focusable.
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

  const inner = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span
          className="text-muted-foreground min-w-0 truncate text-[0.6rem] font-semibold tracking-wide uppercase"
          title={slot.name}
        >
          {slot.name}
        </span>
        <span className="sr-only">, {formatDayLabel(date)}</span>
        {isEmpty ? (
          <span className="text-muted-foreground shrink-0 text-[0.65rem] tabular-nums">
            {formatMacro(slot.target.calories)}
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 text-[0.65rem] tabular-nums">
            {over ? (
              <>
                <span
                  aria-hidden="true"
                  className="inline-block -translate-y-0.5 leading-none"
                >
                  ▲
                </span>
                <span className="text-foreground font-semibold">
                  {formatMacro(slot.totals.calories)}
                </span>
              </>
            ) : (
              formatMacro(slot.totals.calories)
            )}
            <span className="text-muted-foreground">
              {" / "}
              {formatMacro(slot.target.calories)}
            </span>
          </span>
        )}
      </span>

      {isEmpty ? (
        <span className="text-muted-foreground text-xs">Nothing planned</span>
      ) : (
        <span className="grid min-w-0 gap-0.5">
          {Object.values(
            slot.meals.reduce<
              Record<
                string,
                {
                  mealId: string;
                  name: string;
                  count: number;
                  calories: number;
                }
              >
            >((acc, meal) => {
              const key = meal.mealId;
              const existing = acc[key];
              if (existing) {
                existing.count += 1;
                existing.calories += meal.totals.calories;
              } else {
                acc[key] = {
                  mealId: meal.mealId,
                  name: meal.name,
                  count: 1,
                  calories: meal.totals.calories,
                };
              }
              return acc;
            }, {}),
          ).map((group) => (
            <span
              key={group.mealId}
              className="flex min-w-0 items-baseline gap-1"
            >
              <span
                className="min-w-0 flex-1 truncate text-sm"
                title={
                  group.count > 1 ? `${group.name} ×${group.count}` : group.name
                }
              >
                {group.name}
                {group.count > 1 ? ` ×${group.count}` : ""}
              </span>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {formatMacro(group.calories)}
              </span>
            </span>
          ))}
        </span>
      )}

      {over ? <span className="sr-only">, {over}</span> : null}
    </>
  );

  const classes = cn(
    "flex w-full flex-col gap-2 rounded-lg border p-2.5 text-left",
    isEmpty ? "border-transparent bg-muted/40" : "border-border bg-card",
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
        "cursor-pointer hover:border-ring focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
      )}
    >
      {inner}
    </button>
  );
}
