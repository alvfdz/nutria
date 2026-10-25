import type { Metadata } from "next";

import { MealLibrary } from "@/components/meals/meal-library";
import { NewMealForm } from "@/components/meals/new-meal-form";
import { PageContainer } from "@/components/page-container";
import { requireUser } from "@/lib/auth/session";
import { listIngredients } from "@/lib/ingredients/repository";
import { listMeals } from "@/lib/meals/repository";

export const metadata: Metadata = {
  title: "Meals",
};

/**
 * Meal library route. Loads the signed-in user's ingredients and meals on the
 * server and renders the create form beside the library. The form doubles as the
 * onboarding step when there are no ingredients to build from yet.
 */
export default async function MealsPage() {
  const user = await requireUser();
  const [ingredients, meals] = await Promise.all([
    listIngredients(user.id),
    listMeals(user.id),
  ]);

  return (
    <main className="flex-1">
      <PageContainer className="py-10">
        <header className="grid gap-1">
          <h1 className="font-heading text-2xl font-medium tracking-tight">
            Meals
          </h1>
          <p className="text-muted-foreground text-sm">
            The meals you build from your ingredients, ready to plan with.
          </p>
        </header>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <NewMealForm ingredients={ingredients} />
          <MealLibrary meals={meals} ingredients={ingredients} />
        </div>
      </PageContainer>
    </main>
  );
}
