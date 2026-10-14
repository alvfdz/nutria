import type { SlotBudget } from "@/lib/goals/budget";
import { formatMacro } from "@/lib/ingredients/format";
import type { MealTotals } from "@/lib/meals/macros";
import {
  barGeometry,
  macroState,
  stateLabel,
  type MacroKey,
  type MacroState,
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
 * Renders a macro's short state marker. The glyph carries the state in text
 * form so it is never colour-only: a tick when met, the signed gap otherwise.
 *
 * @param state The classification from {@link macroState}.
 * @param delta The signed gap (`planned - target`).
 * @returns `✓`, `−n` or `+n`.
 */
function markerFor(state: MacroState, delta: number): string {
  if (state === "met") return "✓";
  if (state === "short") return `−${formatMacro(Math.abs(delta))}`;

  return `+${formatMacro(delta)}`;
}

/**
 * The food panel's macro guidance: one bar per macro, protein → carbs → fat.
 * Each row reads left to right as the macro name, the planned amount against
 * its target in grams, and a state marker. Below the row, a track scaled to
 * the larger of the plan and the target carries the plan as a fill, so an
 * overshoot fills the whole track. Every row carries the full
 * {@link stateLabel} sentence as its accessible name.
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
        const { state, delta } = macroState(planned, targetValue);
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
              <span className="tabular-nums">
                {formatMacro(planned)}
                <span className="text-muted-foreground">
                  /{formatMacro(targetValue)} g
                </span>
              </span>
              <span className="text-muted-foreground ml-auto tabular-nums">
                {markerFor(state, delta)}
              </span>
            </span>

            <span
              aria-hidden="true"
              data-slot="macro-bar-track"
              className="bg-muted block h-2 overflow-hidden rounded-full"
            >
              <span
                data-slot="macro-bar-fill"
                className="bg-primary block h-full rounded-full"
                style={{ width: `${fillPercent}%` }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
