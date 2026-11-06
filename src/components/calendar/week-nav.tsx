import Link from "next/link";

import { cn } from "cn";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { WEEK_BACK, WEEK_FORWARD } from "@/components/calendar/week-slide";
import { Button, buttonVariants } from "@/components/ui/button";
import { addWeeks, formatWeekRange } from "@/lib/calendar/week";
import { CARD_TITLE_CLASS, ICON_STROKE } from "@/lib/design-system";

/**
 * Week navigation above the board: the shown range, then today, previous and
 * next. Backwards stops at the current week — there, previous is a disabled
 * button rather than a link, because the calendar never looks into the past,
 * and Today is left out, because it would link to the page already showing.
 * Pure links, so no client JavaScript is needed. Each link tags its navigation
 * with a direction, so `WeekSlide` slides the board the matching way.
 *
 * @param props.weekStart The shown week's Monday, `YYYY-MM-DD`.
 * @param props.isCurrentWeek Whether the shown week is the current week, in
 *   which case there is nowhere to go back to.
 */
export function WeekNav({
  weekStart,
  isCurrentWeek,
}: {
  weekStart: string;
  isCurrentWeek: boolean;
}) {
  // Through `cn`, like `Button` itself: raw variants keep the base's transparent
  // border next to the outline's, and the transparent one wins in light mode.
  const iconLinkClass = cn(
    buttonVariants({ variant: "outline", size: "icon" }),
  );

  return (
    <nav
      aria-label="Week"
      className="flex flex-wrap items-center justify-between gap-2"
    >
      <span className={CARD_TITLE_CLASS}>{formatWeekRange(weekStart)}</span>

      <div className="flex items-center gap-2">
        {isCurrentWeek ? null : (
          <Link
            href="/calendar"
            scroll={false}
            transitionTypes={[WEEK_BACK]}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Today
          </Link>
        )}

        {isCurrentWeek ? (
          <Button
            variant="outline"
            size="icon"
            disabled
            aria-label="Previous week"
          >
            <ChevronLeft strokeWidth={ICON_STROKE} />
          </Button>
        ) : (
          <Link
            href={`?week=${addWeeks(weekStart, -1)}`}
            scroll={false}
            transitionTypes={[WEEK_BACK]}
            aria-label="Previous week"
            className={iconLinkClass}
          >
            <ChevronLeft strokeWidth={ICON_STROKE} />
          </Link>
        )}

        <Link
          href={`?week=${addWeeks(weekStart, 1)}`}
          scroll={false}
          transitionTypes={[WEEK_FORWARD]}
          aria-label="Next week"
          className={iconLinkClass}
        >
          <ChevronRight strokeWidth={ICON_STROKE} />
        </Link>
      </div>
    </nav>
  );
}
