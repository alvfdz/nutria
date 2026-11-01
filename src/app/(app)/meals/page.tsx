import type { Metadata } from "next";

import { MealLibrary } from "@/components/meals/meal-library";
import { PageContainer } from "@/components/page-container";
import { requireUser } from "@/lib/auth/session";
import { listIngredients } from "@/lib/ingredients/repository";
import { listMeals } from "@/lib/meals/repository";

export const metadata: Metadata = {
  title: "Meals",
};

/**
 * Meal library route. Loads the signed-in user's ingredients and meals on the
 * server and renders the library. The page opts into the design-system palette
 * through `nutria-theme`, and narrows the shared container to the 1200px content
 * width (plus its 24px gutters); the width is forced because the container's own
 * `lg:`/`xl:` steps would otherwise win.
 */
export default async function MealsPage() {
  const user = await requireUser();
  const [ingredients, meals] = await Promise.all([
    listIngredients(user.id),
    listMeals(user.id),
  ]);

  return (
    <main className="nutria-theme bg-background text-foreground flex-1 tabular-nums">
      <PageContainer className="max-w-[1248px]! py-12">
        <header className="grid gap-1">
          <h1 className="font-heading type-page-title">Meals</h1>
          <p className="text-muted-foreground text-sm">
            The meals you build from your ingredients, ready to plan with.
          </p>
        </header>

        <div className="mt-8">
          <MealLibrary meals={meals} ingredients={ingredients} />
        </div>
      </PageContainer>
    </main>
  );
}
