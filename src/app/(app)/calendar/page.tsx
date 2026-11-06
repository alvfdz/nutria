import type { Metadata } from "next";

import { WeekBoard } from "@/components/calendar/week-board";
import { WeekNav } from "@/components/calendar/week-nav";
import { WeekSlide } from "@/components/calendar/week-slide";
import { PageContainer } from "@/components/page-container";
import { SetBudgetCard } from "@/components/set-budget-card";
import {
  addDays,
  clampWeekToCurrent,
  dbDateFromKey,
  parseWeekParam,
  startOfWeek,
  todayKey,
} from "@/lib/calendar/week";
import { requireUser } from "@/lib/auth/session";
import { getGoals } from "@/lib/goals/repository";
import { listMeals } from "@/lib/meals/repository";
import { getPlansForRange } from "@/lib/plan/repository";
import { buildDays } from "@/lib/plan/views";

export const metadata: Metadata = { title: "Calendar" };

/**
 * Calendar route. Requires a signed-in user, resolves the requested week from `?week=`, clamps it to the
 * current week so the past is never shown, and renders the week board from the
 * user's stored goals and plan. Without goals yet it explains what to do and points
 * at `/goals`. Moving between weeks slides the board through `WeekSlide`. The page opts into the design-system palette through `nutria-theme`.
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
              <WeekSlide weekStart={weekStart}>
                <WeekBoard
                  days={buildDays(goals, plans, weekStart, today)}
                  meals={meals}
                />
              </WeekSlide>
            </>
          ) : (
            <SetBudgetCard />
          )}
        </div>
      </PageContainer>
    </main>
  );
}
