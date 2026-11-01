import type { Metadata } from "next";

import { IngredientLibrary } from "@/components/ingredients/ingredient-library";
import { PageContainer } from "@/components/page-container";
import { requireUser } from "@/lib/auth/session";
import {
  getIngredientUsage,
  listIngredients,
} from "@/lib/ingredients/repository";

export const metadata: Metadata = {
  title: "Ingredients",
};

/**
 * Ingredient library route. Loads the signed-in user's ingredients and which
 * meals use them on the server, and renders the library. The page opts into the
 * design-system palette through `nutria-theme`, and narrows the shared container
 * to the 1200px content width (plus its 24px gutters); the width is forced
 * because the container's own `lg:`/`xl:` steps would otherwise win.
 */
export default async function IngredientsPage() {
  const user = await requireUser();
  const [ingredients, usage] = await Promise.all([
    listIngredients(user.id),
    getIngredientUsage(user.id),
  ]);

  return (
    <main className="nutria-theme bg-background text-foreground flex-1 tabular-nums">
      <PageContainer className="max-w-[1248px]! py-12">
        <header className="grid gap-1">
          <h1 className="font-heading type-page-title">Ingredients</h1>
          <p className="text-muted-foreground text-sm">
            The raw building blocks of every meal template you plan.
          </p>
        </header>

        <div className="mt-8">
          <IngredientLibrary ingredients={ingredients} usage={usage} />
        </div>
      </PageContainer>
    </main>
  );
}
