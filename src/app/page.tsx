import Link from "next/link";

import { PageContainer } from "@/components/page-container";
import { buttonVariants } from "@/components/ui/button";

// `href` is omitted for the steps that have no route yet, which is what makes
// their call to action render as plain text instead of a link.
type Step = {
  title: string;
  description: string;
  cta: { label: string; href?: "/ingredients" | "/meals" | "/calendar" };
};

const steps: Step[] = [
  {
    title: "Ingredients",
    description:
      "Save the raw foods you cook with, with their macros per 100 g.",
    cta: { label: "Open the library", href: "/ingredients" },
  },
  {
    title: "Meal templates",
    description:
      "Group ingredients into reusable meals you can plan ahead with.",
    cta: { label: "Preview", href: "/meals" },
  },
  {
    title: "Daily planner",
    description: "Assign meals to days and meal slots against a macro budget.",
    cta: { label: "Open the calendar", href: "/calendar" },
  },
];

/** Landing page: introduces the three-step workflow and links into the app. */
export default function Home() {
  return (
    <main className="flex-1">
      <PageContainer className="py-16">
        <div className="grid max-w-2xl gap-6">
          <h1 className="font-heading text-4xl leading-tight font-medium tracking-tight">
            Design your days of eating before you eat them.
          </h1>
          <p className="text-muted-foreground text-lg">
            Nutria is an open-source nutrition planner. It pairs a macro tracker
            with a forward-looking meal scheduler, so you see your remaining
            budget for a meal before you sit down to it.
          </p>
          <div>
            <Link
              href="/ingredients"
              className={buttonVariants({ size: "lg" })}
            >
              Start with your ingredients
            </Link>
          </div>
        </div>

        <ol className="mt-16 grid gap-px overflow-hidden rounded-xl bg-border sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="grid gap-2 bg-card p-6">
              <span className="text-muted-foreground text-xs tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2 className="font-heading text-base font-medium">
                {step.title}
              </h2>
              <p className="text-muted-foreground text-sm">
                {step.description}
              </p>
              {step.cta.href ? (
                <Link
                  href={step.cta.href}
                  className="text-sm underline-offset-4 hover:underline"
                >
                  {step.cta.label}
                </Link>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {step.cta.label}
                </p>
              )}
            </li>
          ))}
        </ol>
      </PageContainer>
    </main>
  );
}
