import { formatDayLabel } from "@/lib/calendar/week";
import type { SlotPlanUsage } from "@/lib/plan/types";

import { PCT_TOLERANCE } from "./schema";

/** The thin space that separates a value from its unit, as in `150 g`. */
export const THIN_SPACE = " ";

/**
 * Formats a gram, kcal or percentage value as the integer the goals view shows.
 *
 * @param value The raw value, possibly fractional.
 * @returns The value rounded to the nearest integer, as text.
 */
export function formatWhole(value: number): string {
  return String(Math.round(value));
}

/** Whether a percentage total can be saved, and the sentence that says so. */
export type PercentTotalStatus = {
  /** True when the total is close enough to 100 for the schema to accept it. */
  valid: boolean;
  /** One sentence stating the total and, when invalid, how to fix it. */
  message: string;
};

/**
 * Rounds to two decimals, which drops floating-point leftovers while keeping an
 * entered fraction such as 33.33 honest.
 */
const toHundredths = (value: number) => Math.round(value * 100) / 100;

/**
 * Describes a percentage total for the inline status line, using the same
 * tolerance as the save-time check so the line never disagrees with the schema.
 * An invalid total keeps its decimals, because rounding could report a total
 * that is off by a fraction as exactly 100%.
 *
 * @param subject What is being totalled, for example `Macros`.
 * @param total The sum of the entered percentages.
 * @returns The validity and the sentence to show.
 */
export function percentTotalStatus(
  subject: string,
  total: number,
): PercentTotalStatus {
  if (Math.abs(total - 100) <= PCT_TOLERANCE) {
    return { valid: true, message: `${subject} total ${formatWhole(total)}%` };
  }

  const gap = toHundredths(Math.abs(100 - total));
  const fix = total < 100 ? `add ${gap}%` : `remove ${gap}%`;

  return {
    valid: false,
    message: `${subject} total ${toHundredths(total)}% — ${fix} to reach 100%`,
  };
}

/** How many days a removal warning names before summarizing the rest. */
const MAX_LISTED_DAYS = 3;

/**
 * Says what removing a stored meal will do to its plans.
 *
 * @param name The meal's name.
 * @param usage The plans the meal has, if any.
 * @returns The warning, or `null` when the meal has no plans.
 */
export function removedMealWarning(
  name: string,
  usage: SlotPlanUsage | undefined,
): string | null {
  if (usage && usage.upcomingDays.length > 0) {
    const listed = usage.upcomingDays
      .slice(0, MAX_LISTED_DAYS)
      .map(formatDayLabel)
      .join(", ");
    const extra = usage.upcomingDays.length - MAX_LISTED_DAYS;
    const days = extra > 0 ? `${listed} and ${extra} more` : listed;

    return `${name} has planned meals on ${days}. Remove those plans from the calendar to save this change, or reset to keep the meal.`;
  }

  if (usage?.hasPastPlans) {
    return `Saving also deletes the past plans for ${name}.`;
  }

  return null;
}

/**
 * Names the totals that stop the form from saving.
 *
 * @param macrosValid Whether the macro total can be saved.
 * @param mealsValid Whether the meal total can be saved.
 * @returns The sentence for the action bar, or `null` when both are valid.
 */
export function saveBlockerMessage(
  macrosValid: boolean,
  mealsValid: boolean,
): string | null {
  if (macrosValid && mealsValid) return null;
  if (!macrosValid && !mealsValid)
    return "Fix the macro and meal totals to save";

  return macrosValid
    ? "Fix the meal total to save"
    : "Fix the macro total to save";
}
