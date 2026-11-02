import type { Metadata } from "next";
import Link from "next/link";

import { WeekBoard } from "@/components/calendar/week-board";
import { WeekNav } from "@/components/calendar/week-nav";
import { PageContainer } from "@/components/page-container";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  addDays,
  clampWeekToCurrent,
  dayOfMonth,
  dbDateFromKey,
  parseWeekParam,
  startOfWeek,
  todayKey,
  weekDays,
  weekdayShort,
} from "@/lib/calendar/week";
import { computeMacroBudget, computeSlotBudgets } from "@/lib/goals/budget";
import { requireUser } from "@/lib/auth/session";
import { CARD_CLASS, CARD_TITLE_CLASS } from "@/lib/design-system";
import { getGoals } from "@/lib/goals/repository";
import type { Goals } from "@/lib/goals/types";
import { computeMealTotals, itemCalories } from "@/lib/meals/macros";
import { listMeals } from "@/lib/meals/repository";
import { getPlansForRange } from "@/lib/plan/repository";
import { sumTotals } from "@/lib/plan/rollup";
import type { DayColumn, PlannedMeal, SlotView } from "@/lib/plan/types";

export const metadata: Metadata = { title: "Calendar" };

/**
 * Builds the seven board columns for a week from the user's current goals and
 * the week's plan rows. Slot names, order, shares and targets all come from
 * the goals at render time; the plan only says which meals sit where.
 *
 * @param goals The stored daily goals, slots in dining order.
 * @param plans Every plan row in the shown week.
 * @param weekStart The shown week's Monday.
 * @param today Today's key, used to mark the column and gate the controls.
 * @returns One {@link DayColumn} per day, Monday → Sunday.
 */
function buildDays(
  goals: Goals,
  plans: PlannedMeal[],
  weekStart: string,
  today: string,
): DayColumn[] {
  const budget = computeMacroBudget(goals);
  const slotBudgets = computeSlotBudgets(goals, goals.slots);

  const byDayAndSlot = new Map<string, PlannedMeal[]>();
  for (const plan of plans) {
    const key = `${plan.date}|${plan.mealSlotId}`;
    const list = byDayAndSlot.get(key);

    if (list) {
      list.push(plan);
    } else {
      byDayAndSlot.set(key, [plan]);
    }
  }

  return weekDays(weekStart).map((date) => {
    const slots: SlotView[] = goals.slots.map((slot, index) => {
      const slotPlans = (byDayAndSlot.get(`${date}|${slot.id}`) ?? []).sort(
        (a, b) => a.sortOrder - b.sortOrder,
      );
      const meals = slotPlans.map((plan) => ({
        id: plan.id,
        mealId: plan.meal.id,
        name: plan.meal.name,
        totals: computeMealTotals(plan.meal),
        items: plan.meal.items.map((item) => ({
          id: item.id,
          name: item.ingredient.name,
          grams: item.grams,
          calories: itemCalories(item),
        })),
      }));

      return {
        id: slot.id,
        name: slot.name,
        percent: slot.percent,
        target: slotBudgets[index],
        meals,
        totals: sumTotals(meals.map((meal) => meal.totals)),
      };
    });

    return {
      date,
      weekday: weekdayShort(date),
      dayOfMonth: dayOfMonth(date),
      isToday: date === today,
      isEditable: date >= today,
      budget,
      planned: sumTotals(slots.map((slot) => slot.totals)),
      slots,
    };
  });
}

/**
 * Calendar route. Requires a signed-in user, resolves the requested week from `?week=`, clamps it to the
 * current week so the past is never shown, and renders the week board from the
 * user's stored goals and plan. Without goals yet it explains what to do and points
 * at `/goals`. The page opts into the design-system palette through `nutria-theme`.
 */
export default async function CalendarPage(props: PageProps<"/calendar">) {
  const user = await requireUser();
  const today = todayKey();
  const currentWeekStart = startOfWeek(today);
  const weekStart = clampWeekToCurrent(
    parseWeekParam((await props.searchParams).week),
  );
  const [goals, meals, plans] = await Promise.all([
    getGoals(user.id),
    listMeals(user.id),
    getPlansForRange(
      user.id,
      dbDateFromKey(weekStart),
      dbDateFromKey(addDays(weekStart, 6)),
    ),
  ]);

  return (
    <main className="nutria-theme bg-background text-foreground flex-1 tabular-nums">
      <PageContainer width="wide" className="py-12">
        <header className="grid gap-1">
          <h1 className="font-heading type-page-title">Calendar</h1>
          <p className="text-muted-foreground text-sm">
            Your week of meals against the daily budget.
          </p>
        </header>

        <div className="mt-8 grid gap-4">
          {goals ? (
            <>
              <WeekNav
                weekStart={weekStart}
                isCurrentWeek={weekStart === currentWeekStart}
              />
              <WeekBoard
                days={buildDays(goals, plans, weekStart, today)}
                meals={meals}
              />
            </>
          ) : (
            <Card className={CARD_CLASS}>
              <CardContent>
                <Empty className="py-10">
                  <EmptyHeader>
                    <EmptyTitle className={CARD_TITLE_CLASS}>
                      Set your budget first
                    </EmptyTitle>
                    <EmptyDescription>
                      The calendar splits your daily calories and macros across
                      the day&apos;s meals. Set your goals once and every day
                      gets its targets.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Link href="/goals" className={buttonVariants()}>
                      Set your budget
                    </Link>
                  </EmptyContent>
                </Empty>
              </CardContent>
            </Card>
          )}
        </div>
      </PageContainer>
    </main>
  );
}
