import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Meals",
};

/**
 * Meals route. Placeholder for the meal library: it explains what a meal will
 * be and points back at the ingredients a meal is built from.
 */
export default function MealsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <header className="grid gap-1">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Meals
        </h1>
        <p className="text-muted-foreground text-sm">
          The meals you build from your ingredients, ready to plan with.
        </p>
      </header>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>A meal is a set of ingredients</CardTitle>
            <CardDescription>
              Give a group of ingredients a name and a quantity each, and its
              macros total themselves.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Save the meals you cook often, then plan them into a day against
              your macro budget.
            </p>
            <Link
              href="/ingredients"
              className={buttonVariants({
                variant: "outline",
                className: "mt-4",
              })}
            >
              Add ingredients first
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
