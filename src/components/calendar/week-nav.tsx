import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { addWeeks, formatWeekRange } from "@/lib/calendar/week";

/**
 * Week navigation above the board: previous, today, and next. Backwards stops
 * at the current week — before it, `‹ Prev` is a disabled button rather than a
 * link, because the calendar never looks into the past. Pure links, so no
 * client JavaScript is needed.
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
  const linkClass = buttonVariants({ variant: "outline", size: "sm" });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isCurrentWeek ? (
        <button
          type="button"
          disabled
          aria-disabled="true"
          className={linkClass}
        >
          ‹ Prev
        </button>
      ) : (
        <Link
          href={`?week=${addWeeks(weekStart, -1)}`}
          scroll={false}
          className={linkClass}
        >
          ‹ Prev
        </Link>
      )}

      <Link href="/calendar" scroll={false} className={linkClass}>
        Today
      </Link>

      <Link
        href={`?week=${addWeeks(weekStart, 1)}`}
        scroll={false}
        className={linkClass}
      >
        › Next
      </Link>

      <span className="text-muted-foreground ml-1 text-sm">
        {formatWeekRange(weekStart)}
      </span>
    </div>
  );
}
