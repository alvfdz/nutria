import { MacroDot, type MacroName } from "@/components/segmented-bar";
import { THIN_SPACE } from "@/lib/design-system";

/** One cell of a {@link StatTiles} row: a marked macro name and its grams. */
function StatTile({
  macro,
  label,
  grams,
}: {
  macro: MacroName;
  label: string;
  grams: string;
}) {
  return (
    <div className="grid min-w-0 gap-1 p-3">
      <dt className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <MacroDot macro={macro} />
        {label}
      </dt>
      <dd className="text-lg font-semibold">
        {grams}
        {THIN_SPACE}
        <span className="text-muted-foreground text-sm font-normal">g</span>
      </dd>
    </div>
  );
}

/**
 * The 3-cell bordered row of protein, carbs and fat grams, always in that order.
 * The grams arrive formatted, because a target shows integers and a meal's
 * quantities show a decimal.
 *
 * @param props.protein Protein grams, as text.
 * @param props.carbs Carbs grams, as text.
 * @param props.fat Fat grams, as text.
 * @returns The row, as a description list; never throws.
 */
export function StatTiles({
  protein,
  carbs,
  fat,
}: {
  protein: string;
  carbs: string;
  fat: string;
}) {
  return (
    <dl className="divide-border grid grid-cols-3 divide-x rounded-lg border">
      <StatTile macro="protein" label="Protein" grams={protein} />
      <StatTile macro="carbs" label="Carbs" grams={carbs} />
      <StatTile macro="fat" label="Fat" grams={fat} />
    </dl>
  );
}
