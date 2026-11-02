import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { CARD_CLASS, CARD_TITLE_CLASS } from "@/lib/design-system";

/**
 * Empty state for views that need a daily budget before they can show anything.
 * Explains why and links to where the budget is set.
 *
 * @returns The card; never throws.
 */
export function SetBudgetCard() {
  return (
    <Card className={CARD_CLASS}>
      <CardContent>
        <Empty className="py-10">
          <EmptyHeader>
            <EmptyTitle className={CARD_TITLE_CLASS}>
              Set your budget first
            </EmptyTitle>
            <EmptyDescription>
              Nutria splits your daily calories and macros across the day&apos;s
              meals. Set your goals once and every day gets its targets.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/goals" className={buttonVariants()}>
              Set your budget
            </Link>
          </EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  );
}
