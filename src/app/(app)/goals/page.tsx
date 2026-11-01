import type { Metadata } from "next";

import { GoalsView } from "@/components/goals/goals-form";
import { PageContainer } from "@/components/page-container";
import { requireUser } from "@/lib/auth/session";
import { getGoals } from "@/lib/goals/repository";
import { getSlotPlanUsage } from "@/lib/plan/repository";

export const metadata: Metadata = {
  title: "Goals",
};

/**
 * Goals route. Requires a signed-in user, loads their stored goals row (or
 * nothing on first visit) and what each meal has planned, so the form can warn
 * about a removal before it is saved, and renders the setup form under the intro. `GoalsView` keys its form on
 * `updatedAt` so a successful save re-seeds it from the database; it also
 * owns the save action, so the success toast fires even though the form
 * remounts after each save. When no goals exist yet the same form acts as the
 * onboarding step. The page opts into the design-system palette through
 * `nutria-theme`, and narrows the shared container to the 1200px content width
 * (plus its 24px gutters); the width is forced because the container's own
 * `lg:`/`xl:` steps would otherwise win.
 */
export default async function GoalsPage() {
  const user = await requireUser();
  const [goals, slotUsage] = await Promise.all([
    getGoals(user.id),
    getSlotPlanUsage(user.id),
  ]);

  return (
    <main className="nutria-theme bg-background text-foreground flex-1 tabular-nums">
      <PageContainer className="max-w-[1248px]! py-12">
        <div className="grid gap-8">
          <header className="grid gap-1">
            <h1 className="font-heading type-page-title">Goals</h1>
            <p className="text-muted-foreground text-sm">
              Your daily calorie budget, split across macros and meals.
            </p>
          </header>

          <GoalsView goals={goals} slotUsage={slotUsage} />
        </div>
      </PageContainer>
    </main>
  );
}
