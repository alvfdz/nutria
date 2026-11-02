import { cn } from "cn";

import { MACRO_COLOR } from "@/components/segmented-bar";
import { THIN_SPACE } from "@/lib/design-system";
import type { SlotBudget } from "@/lib/goals/budget";
import { formatWhole } from "@/lib/goals/display";
import type { MealTotals } from "@/lib/meals/macros";
import {
  barGeometry,
  macroState,
  stateLabel,
  stateMarker,
  type MacroKey,
} from "@/lib/plan/rollup";

/** One bar's static wiring: key, name and value readers. */
type BarSpec = {
  /** Which macro the bar reports on. */
  key: MacroKey;
  /** Display name, e.g. `Protein`. */
  name: string;
  /** Reads the bar's planned amount from the panel totals. */
  planned: (totals: MealTotals) => number;
  /** Reads the bar's target amount from the slot budget. */
  target: (budget: SlotBudget) => number;
};

/** The three bars, in protein → carbs → fat order. */
const BARS: BarSpec[] = [
  {
    key: "protein",
    name: "Protein",
    planned: (totals) => totals.protein,
    target: (budget) => budget.proteinGrams,
  },
  {
    key: "carbs",
    name: "Carbs",
    planned: (totals) => totals.carbs,
    target: (budget) => budget.carbsGrams,
  },
  {
    key: "fat",
    name: "Fat",
    planned: (totals) => totals.fat,
    target: (budget) => budget.fatGrams,
  },
];

/**
 * The food panel's macro guidance: one bar per macro, protein → carbs → fat.
 * Each row reads left to right as the macro name, the planned amount against
 * its target in grams, and a state marker. Below the row, a 6px track scaled to
 * the larger of the plan and the target carries the plan as a fill in the
 * macro's colour, so an overshoot fills the whole track. Every row carries the
 * full {@link stateLabel} sentence as its accessible name.
 *
 * @param props.totals The macros the food's planned meals deliver.
 * @param props.target The food's target macros.
 */
export function MacroBars({
  totals,
  target,
}: {
  totals: MealTotals;
  target: SlotBudget;
}) {
  return (
    <ul className="grid gap-3">
      {BARS.map((bar) => {
        const planned = bar.planned(totals);
        const targetValue = bar.target(target);
        const { state } = macroState(planned, targetValue);
        const label = stateLabel(state, bar.key, planned, targetValue);
        const { fillPercent } = barGeometry(planned, targetValue);

        return (
          <li
            key={bar.key}
            data-slot="macro-bar"
            aria-label={label}
            className="grid gap-1.5"
          >
            <span className="flex items-baseline gap-2 text-xs">
              <span className="font-medium">{bar.name}</span>
              <span>
                {formatWhole(planned)}
                <span className="text-muted-foreground">
                  /{formatWhole(targetValue)}
                  {THIN_SPACE}g
                </span>
              </span>
              <span
                className={cn(
                  "ml-auto",
                  state === "met" ? "text-brand" : "text-muted-foreground",
                )}
              >
                {stateMarker(planned, targetValue)}
              </span>
            </span>

            <span
              aria-hidden="true"
              data-slot="macro-bar-track"
              className="bg-muted block h-1.5 overflow-hidden rounded-full"
            >
              <span
                data-slot="macro-bar-fill"
                className={cn(
                  "block h-full rounded-full",
                  MACRO_COLOR[bar.key],
                )}
                style={{ width: `${fillPercent}%` }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
