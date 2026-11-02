import { formatWhole } from "@/lib/goals/display";
import { budgetBarGeometry } from "@/lib/plan/today";

/** Classes shared by the two filled zones, including the page's one animation. */
const ZONE_CLASS =
  "block h-full transition-[width] duration-300 motion-reduce:transition-none";

/**
 * The day's kcal at a glance: a 6px bar with eaten solid, still planned faint
 * and unplanned empty. Ticking a meal turns its faint part solid.
 *
 * @param props.eaten Kcal eaten.
 * @param props.stillPlanned Kcal still planned.
 * @param props.target The daily kcal target.
 */
export function DayBudgetBar({
  eaten,
  stillPlanned,
  target,
}: {
  eaten: number;
  stillPlanned: number;
  target: number;
}) {
  const { eatenPercent, plannedPercent } = budgetBarGeometry(
    eaten,
    stillPlanned,
    target,
  );

  return (
    <span
      role="img"
      aria-label={`${formatWhole(eaten)} of ${formatWhole(target)} kcal eaten, ${formatWhole(stillPlanned)} kcal still planned`}
      className="bg-muted flex h-1.5 overflow-hidden rounded-full"
    >
      <span
        data-slot="budget-bar-eaten"
        className={`${ZONE_CLASS} bg-primary`}
        style={{ width: `${eatenPercent}%` }}
      />
      <span
        data-slot="budget-bar-planned"
        className={`${ZONE_CLASS} bg-primary/30`}
        style={{ width: `${plannedPercent}%` }}
      />
    </span>
  );
}
