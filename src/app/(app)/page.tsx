import type { Metadata } from "next";
import Link from "next/link";

import { cn } from "cn";

import { PageContainer } from "@/components/page-container";
import { SetBudgetCard } from "@/components/set-budget-card";
import { TodayBoard } from "@/components/today/today-board";
import { buttonVariants } from "@/components/ui/button";
import { WelcomeTutorial } from "@/components/welcome-tutorial";
import { requireUser } from "@/lib/auth/session";
import { dbDateFromKey, formatLongDate, todayKey } from "@/lib/calendar/week";
import { getGoals } from "@/lib/goals/repository";
import { listMeals } from "@/lib/meals/repository";
import { getPlansForRange } from "@/lib/plan/repository";
import { buildDay } from "@/lib/plan/views";
import { hasSeenTutorial } from "@/lib/tutorial/repository";

export const metadata: Metadata = { title: "Today" };

/**
 * Home: the current day. Shows today's planned meals to tick off and what's left
 * of the budget; planning ahead stays on the calendar. Without goals yet it
 * points at `/goals`. The welcome tutorial opens over it until the owner has
 * seen it, and again on `?tutorial=replay`.
 */
export default async function TodayPage(props: PageProps<"/">) {
  const user = await requireUser();
  const today = todayKey();
  const date = dbDateFromKey(today);
  const { tutorial } = await props.searchParams;
  const [goals, meals, plans, tutorialSeen] = await Promise.all([
    getGoals(user.id),
    listMeals(user.id),
    getPlansForRange(user.id, date, date),
    hasSeenTutorial(user.id),
  ]);

  return (
    <main className="nutria-theme bg-background text-foreground flex-1 tabular-nums">
      <PageContainer className="max-w-[1248px]! py-12">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-1">
            <h1 className="font-heading type-page-title">
              {formatLongDate(today)}
            </h1>
            <p className="text-muted-foreground text-sm">
              Mark meals as you eat them.
            </p>
          </div>
          <Link
            href="/calendar"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Plan this week
          </Link>
        </header>

        <div className="mt-8">
          {goals ? (
            <TodayBoard
              day={buildDay(goals, plans, today, today)}
              meals={meals}
            />
          ) : (
            <SetBudgetCard />
          )}
        </div>
      </PageContainer>
      {tutorial === "replay" || !tutorialSeen ? (
        <WelcomeTutorial hasGoals={goals !== null} />
      ) : null}
    </main>
  );
}
