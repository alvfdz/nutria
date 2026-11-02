import { cn } from "cn";

import { MacroBars } from "@/components/macro-bars";
import { DayBudgetBar } from "@/components/today/day-budget-bar";
import { Card, CardContent } from "@/components/ui/card";
import { CARD_CLASS, THIN_SPACE } from "@/lib/design-system";
import type { MacroBudget } from "@/lib/goals/budget";
import { formatWhole } from "@/lib/goals/display";
import type { DaySummary } from "@/lib/plan/today";

/**
 * Words what is left of the day's kcal. Being over isn't an error, so it reads
 * as plainly as being under.
 *
 * @param caloriesLeft Target minus eaten kcal; negative once over budget.
 * @returns `left` or `over`, and the amount to show beside it.
 */
function leftWording(caloriesLeft: number): {
  amount: string;
  word: "left" | "over";
} {
  return {
    amount: formatWhole(Math.abs(caloriesLeft)),
    word: caloriesLeft < 0 ? "over" : "left",
  };
}

/**
 * The day's budget: kcal left as the view's one hero number, the three-zone
 * bar, and each macro eaten against its target.
 *
 * @param props.summary Where the day stands.
 * @param props.budget The day's targets, or null when it has none.
 * @param props.className Extra classes for the card, used to place it.
 */
export function TodayBudget({
  summary,
  budget,
  className,
}: {
  summary: DaySummary;
  budget: MacroBudget | null;
  className?: string;
}) {
  const { amount, word } = leftWording(summary.caloriesLeft);

  return (
    <Card className={cn(CARD_CLASS, className)}>
      <CardContent className="grid gap-6">
        <div className="grid gap-3">
          <h2 className="flex items-baseline gap-1">
            <span className="type-stat-lg">{amount}</span>
            <span className="text-muted-foreground text-sm">kcal {word}</span>
          </h2>
          <DayBudgetBar
            eaten={summary.eaten.calories}
            stillPlanned={summary.stillPlanned.calories}
            target={summary.targetCalories}
          />
          <dl className="type-caption grid gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-muted-foreground">Eaten</dt>
              <dd>
                {formatWhole(summary.eaten.calories)}
                <span className="text-muted-foreground">{THIN_SPACE}kcal</span>
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-muted-foreground">Still planned</dt>
              <dd>
                {formatWhole(summary.stillPlanned.calories)}
                <span className="text-muted-foreground">{THIN_SPACE}kcal</span>
              </dd>
            </div>
          </dl>
        </div>

        {budget ? <MacroBars totals={summary.eaten} target={budget} /> : null}
      </CardContent>
    </Card>
  );
}

/**
 * The phone's reminder of what's left, kept in view under the header while the
 * meals scroll. Hidden from assistive technology, because it repeats the budget
 * card.
 *
 * @param props.caloriesLeft Target minus eaten kcal; negative once over budget.
 */
export function StickyKcalLeft({ caloriesLeft }: { caloriesLeft: number }) {
  const { amount, word } = leftWording(caloriesLeft);

  return (
    <p
      aria-hidden="true"
      data-testid="sticky-kcal-left"
      className="bg-background type-caption sticky top-14 z-[5] py-2 lg:hidden"
    >
      {amount}
      <span className="text-muted-foreground">
        {THIN_SPACE}kcal {word}
      </span>
    </p>
  );
}
