import type { Metadata } from "next";

import { IngredientLibrary } from "@/components/ingredients/ingredient-library";
import { NewIngredientForm } from "@/components/ingredients/new-ingredient-form";
import { PageContainer } from "@/components/page-container";
import { listIngredients } from "@/lib/ingredients/repository";

export const metadata: Metadata = {
  title: "Ingredients",
};

/**
 * Ingredient library route. Loads the stored ingredients on the server and
 * renders the create form beside the library.
 */
export default async function IngredientsPage() {
  const ingredients = await listIngredients();

  return (
    <main className="flex-1">
      <PageContainer className="py-10">
        <header className="grid gap-1">
          <h1 className="font-heading text-2xl font-medium tracking-tight">
            Ingredients
          </h1>
          <p className="text-muted-foreground text-sm">
            The raw building blocks of every meal template you plan.
          </p>
        </header>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <NewIngredientForm />
          <IngredientLibrary ingredients={ingredients} />
        </div>
      </PageContainer>
    </main>
  );
}
