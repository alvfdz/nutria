import { cn } from "cn";
import { Plus, X } from "lucide-react";

import { MacroChips } from "@/components/calendar/macro-chips";
import { Button } from "@/components/ui/button";
import { formatMacro } from "@/lib/ingredients/format";
import type { SlotView } from "@/lib/plan/types";

/**
 * One meal slot of one day: its planned meals, its live kcal line, and the
 * per-macro guidance chips. Read-only on past days — no add or remove
 * controls are rendered at all.
 *
 * @param props.date The day's key, used in labels.
 * @param props.slot The slot view to render.
 * @param props.editable Whether the day can still be planned.
 * @param props.addButtonId Stable id so focus can return to "Add meal".
 * @param props.onAdd Opens the assign dialog for this slot.
 * @param props.removeAction The board's shared remove form action.
 * @param props.removePending Whether a remove is in flight.
 */
export function SlotCard({
  date,
  slot,
  editable,
  addButtonId,
  onAdd,
  removeAction,
  removePending,
}: {
  date: string;
  slot: SlotView;
  editable: boolean;
  addButtonId: string;
  onAdd: () => void;
  removeAction: (formData: FormData) => void;
  removePending: boolean;
}) {
  const isEmpty = slot.meals.length === 0;

  return (
    <section
      aria-label={`${slot.name} on ${date}`}
      className={cn(
        "rounded-lg border p-2.5",
        isEmpty ? "border-border/60 bg-muted/40" : "border-border bg-card",
      )}
    >
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {slot.name}
        </h3>
        <span className="text-xs tabular-nums">
          {formatMacro(slot.totals.calories)}
          <span className="text-muted-foreground">
            {" "}
            / {formatMacro(slot.target.calories)}
          </span>
        </span>
      </header>

      {isEmpty ? (
        <p className="text-muted-foreground mt-1 text-xs">Nothing planned</p>
      ) : (
        <form action={removeAction} className="mt-1.5 grid gap-0.5">
          {slot.meals.map((meal) => (
            <div key={meal.id} className="flex items-center gap-1">
              <span className="min-w-0 flex-1 truncate text-sm">
                {meal.name}
              </span>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {formatMacro(meal.totals.calories)}
              </span>
              {editable ? (
                <Button
                  type="submit"
                  name="planMealId"
                  value={meal.id}
                  variant="ghost"
                  size="icon-xs"
                  disabled={removePending}
                  aria-label={`Remove ${meal.name} from ${slot.name}`}
                >
                  <X />
                </Button>
              ) : null}
            </div>
          ))}
        </form>
      )}

      <div className="mt-2">
        <MacroChips totals={slot.totals} target={slot.target} />
      </div>

      {editable ? (
        <Button
          type="button"
          id={addButtonId}
          variant="ghost"
          size="sm"
          className="mt-2 w-full"
          onClick={onAdd}
        >
          <Plus /> Add meal
        </Button>
      ) : null}
    </section>
  );
}
