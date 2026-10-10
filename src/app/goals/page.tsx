import type { Metadata } from "next";

import { PageContainer } from "@/components/page-container";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Goals",
};

/**
 * Goals route. Placeholder until daily macro targets are configurable; the
 * card marks the spot where the target setup will live.
 */
export default function GoalsPage() {
  return (
    <main className="flex-1">
      <PageContainer className="py-10">
        <header className="grid gap-1">
          <h1 className="font-heading text-2xl font-medium tracking-tight">
            Goals
          </h1>
          <p className="text-muted-foreground text-sm">
            Your daily macro budget: calories, protein, carbs and fat.
          </p>
        </header>

        <Card className="mt-8 max-w-xl">
          <CardHeader>
            <CardTitle>Daily targets are coming soon</CardTitle>
            <CardDescription>
              Soon you&apos;ll set your total daily goals here, and every meal
              you plan will be measured against them.
            </CardDescription>
          </CardHeader>
        </Card>
      </PageContainer>
    </main>
  );
}
