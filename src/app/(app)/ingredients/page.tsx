import type { Metadata } from "next";

import { FoodfactsImport } from "@/components/ingredients/foodfacts-import";
import { IngredientLibrary } from "@/components/ingredients/ingredient-library";
import { NewIngredientForm } from "@/components/ingredients/new-ingredient-form";
import { PageContainer } from "@/components/page-container";
import { requireUser } from "@/lib/auth/session";
import { listIngredients } from "@/lib/ingredients/repository";

export const metadata: Metadata = {
  title: "Ingredients",
};

/**
 * Ingredient library route. Loads the signed-in user's ingredients on the
 * server and renders the create form beside the library.
 */
export default async function IngredientsPage() {
  const user = await requireUser();
  const ingredients = await listIngredients(user.id);

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
          <div className="grid gap-6">
            <NewIngredientForm />
            <FoodfactsImport
              ingredientNames={ingredients.map((ingredient) => ingredient.name)}
            />
          </div>
          <IngredientLibrary ingredients={ingredients} />
        </div>
      </PageContainer>
    </main>
  );
}
