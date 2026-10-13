import { cn } from "cn";

import { formatMacro } from "@/lib/ingredients/format";
import type { MealTotals } from "@/lib/meals/macros";
import type { SlotBudget } from "@/lib/goals/budget";
import { macroState, stateLabel, type MacroKey } from "@/lib/plan/rollup";

/** One chip's static wiring: key, initial, dot colour and value readers. */
type ChipSpec = {
  /** Which macro the chip reports on. */
  key: MacroKey;
  /** Single-letter label, e.g. `P`. */
  letter: string;
  /** Tailwind class painting the chip's dot with the macro token. */
  dotClass: string;
  /** Reads the chip's planned amount from the slot totals. */
  planned: (totals: MealTotals) => number;
  /** Reads the chip's target amount from the slot budget. */
  target: (budget: SlotBudget) => number;
};

/** The three chips, in protein → carbs → fat order. */
const CHIPS: ChipSpec[] = [
  {
    key: "protein",
    letter: "P",
    dotClass: "bg-macro-protein",
    planned: (totals) => totals.protein,
    target: (budget) => budget.proteinGrams,
  },
  {
    key: "carbs",
    letter: "C",
    dotClass: "bg-macro-carbs",
    planned: (totals) => totals.carbs,
    target: (budget) => budget.carbsGrams,
  },
  {
    key: "fat",
    letter: "F",
    dotClass: "bg-macro-fat",
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
function markerFor(state: "met" | "short" | "over", delta: number): string {
  if (state === "met") return "✓";
  if (state === "short") return `−${formatMacro(Math.abs(delta))}`;

  return `+${formatMacro(delta)}`;
}

/**
 * The per-macro guidance row of a slot card: three equal-width chips in a row,
 * one per macro. Each chip reads left to right on a single line — coloured
 * dot, macro letter, planned against target, then a state marker for met,
 * short or over. Text never wraps inside a chip, so the numbers stay readable
 * rather than stacking. The coloured dot is the only colour; each chip's full
 * meaning is also spelled out in its accessible label.
 *
 * @param props.totals The macros the slot's planned meals deliver.
 * @param props.target The slot's target macros.
 */
export function MacroChips({
  totals,
  target,
}: {
  totals: MealTotals;
  target: SlotBudget;
}) {
  return (
    <ul className="grid grid-cols-3 gap-1.5">
      {CHIPS.map((chip) => {
        const planned = chip.planned(totals);
        const targetValue = chip.target(target);
        const { state, delta } = macroState(planned, targetValue);
        const label = stateLabel(state, chip.key, planned, targetValue);

        return (
          <li
            key={chip.key}
            aria-label={label}
            title={label}
            className="flex items-center gap-1 overflow-hidden rounded-md border border-border px-1.5 py-1 text-xs whitespace-nowrap tabular-nums"
          >
            <span
              aria-hidden="true"
              className={cn("size-1.5 shrink-0 rounded-full", chip.dotClass)}
            />
            <span className="text-muted-foreground text-[0.65rem] font-medium uppercase">
              {chip.letter}
            </span>
            <span>
              {formatMacro(planned)}
              <span className="text-muted-foreground">
                /{formatMacro(targetValue)}
              </span>
            </span>
            <span className="text-muted-foreground ml-auto text-[0.65rem]">
              {markerFor(state, delta)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
