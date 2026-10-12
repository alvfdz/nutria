import type { Metadata } from "next";
import Link from "next/link";

import { WeekBoard, type DayColumn } from "@/components/calendar/week-board";
import { WeekNav } from "@/components/calendar/week-nav";
import { PageContainer } from "@/components/page-container";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  clampWeekToCurrent,
  formatDayLabel,
  parseWeekParam,
  startOfWeek,
  todayKey,
  weekDays,
} from "@/lib/calendar/week";
import { computeMacroBudget, computeSlotBudgets } from "@/lib/goals/budget";
import { getGoals } from "@/lib/goals/repository";
import type { Goals } from "@/lib/goals/types";

export const metadata: Metadata = { title: "Calendar" };

/**
 * Builds the seven board columns for a week from the user's goals. Every day
 * starts from the same current targets; plan 2 replaces that with each day's
 * frozen snapshot once the day is planned.
 *
 * @param goals The stored daily goals, slots in dining order.
 * @param weekStart The shown week's Monday.
 * @param today Today's key, used to mark the column.
 * @returns One {@link DayColumn} per day, Monday → Sunday.
 */
function buildDays(
  goals: Goals,
  weekStart: string,
  today: string,
): DayColumn[] {
  const budget = computeMacroBudget(goals);
  const slotBudgets = computeSlotBudgets(goals, goals.slots);

  return weekDays(weekStart).map((date) => ({
    date,
    label: formatDayLabel(date),
    isToday: date === today,
    budget,
    slots: goals.slots.map((slot, index) => ({
      name: slot.name,
      percent: slot.percent,
      target: slotBudgets[index],
    })),
  }));
}

/**
 * Calendar route. Resolves the requested week from `?week=`, clamps it to the
 * current week so the past is never shown, and renders the week board from the
 * stored goals. Without goals yet it explains what to do and points at
 * `/goals`.
 */
export default async function CalendarPage(props: PageProps<"/calendar">) {
  const today = todayKey();
  const currentWeekStart = startOfWeek(today);
  const weekStart = clampWeekToCurrent(
    parseWeekParam((await props.searchParams).week),
  );
  const goals = await getGoals();

  return (
    <main className="flex-1">
      <PageContainer className="py-10">
        <header className="grid gap-1">
          <h1 className="font-heading text-2xl font-medium tracking-tight">
            Calendar
          </h1>
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
              <WeekBoard days={buildDays(goals, weekStart, today)} />
            </>
          ) : (
            <Card className="max-w-xl">
              <CardHeader>
                <CardTitle>Set your budget first</CardTitle>
                <CardDescription>
                  The calendar splits your daily calories and macros across the
                  day&apos;s meals. Set your goals once and every day gets its
                  targets.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/goals" className={buttonVariants()}>
                  Set your budget
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </PageContainer>
    </main>
  );
}
