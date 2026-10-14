import type { Metadata } from "next";

import { GoalsForm } from "@/components/goals/goals-form";
import { PageContainer } from "@/components/page-container";
import { getGoals } from "@/lib/goals/repository";

export const metadata: Metadata = {
  title: "Goals",
};

/**
 * Goals route. Loads the single stored goals row (or nothing on first visit)
 * and renders the setup form under the intro. The form is keyed on
 * `updatedAt` so a successful save re-seeds it from the database; when no
 * goals exist yet the same form acts as the onboarding step. The intro and
 * form span the shared page width so the page keeps the same gutters as the
 * other sections.
 */
export default async function GoalsPage() {
  const goals = await getGoals();

  return (
    <main className="flex-1">
      <PageContainer className="py-10">
        <div className="grid gap-8">
          <header className="grid gap-1">
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              Goals
            </h1>
            <p className="text-muted-foreground text-sm">
              Your daily macro budget: calories, protein, carbs and fat.
            </p>
          </header>

          <GoalsForm key={goals?.updatedAt ?? "first"} goals={goals} />
        </div>
      </PageContainer>
    </main>
  );
}
