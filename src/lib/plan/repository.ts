import "server-only";

import { connection } from "next/server";

import {
  Prisma,
  type PlanMeal as PlanMealDbRow,
} from "@/generated/prisma/client";
import { dbDateFromKey, keyFromDbDate, todayKey } from "@/lib/calendar/week";
import { getPrisma } from "@/lib/db/prisma";
import {
  mealInclude,
  toMeal,
  type MealWithItems,
} from "@/lib/meals/repository";
import type { PlannedMeal } from "./types";

/** A plan row as reads ask for it: the meal with its ordered items embedded. */
type PlanMealWithMeal = PlanMealDbRow & { meal: MealWithItems };

/**
 * What every plan read embeds: the planned template with its items and the
 * ingredients behind them, so view totals need no second query.
 */
const planInclude = { meal: { include: mealInclude } };

/**
 * Stamps a Prisma row as a {@link PlannedMeal}: its `@db.Date` column becomes
 * a `YYYY-MM-DD` key and its embedded meal gets ISO timestamps.
 *
 * @param row The row as Prisma returns it.
 * @returns The same row in the shape the app uses.
 */
function toPlannedMeal(row: PlanMealWithMeal): PlannedMeal {
  return {
    id: row.id,
    date: keyFromDbDate(row.date),
    mealSlotId: row.mealSlotId,
    mealId: row.mealId,
    sortOrder: row.sortOrder,
    meal: toMeal(row.meal),
  };
}

/**
 * Loads every plan row whose day falls inside a date range, with the planned
 * meal embedded. Used by the calendar page to build one week's worth of views
 * in a single query.
 *
 * @param start First day of the range, inclusive, at UTC midnight.
 * @param end Last day of the range, inclusive, at UTC midnight.
 * @returns The matching plans, ordered by day, slot and position.
 */
export async function getPlansForRange(
  start: Date,
  end: Date,
): Promise<PlannedMeal[]> {
  // Nothing else in this read touches Request-time APIs, so without this the
  // query would run while prerendering and get frozen into the build output.
  await connection();

  const rows = await getPrisma().planMeal.findMany({
    where: { date: { gte: start, lte: end } },
    include: planInclude,
    orderBy: [{ date: "asc" }, { mealSlotId: "asc" }, { sortOrder: "asc" }],
  });

  return rows.map(toPlannedMeal);
}

/**
 * Loads a single plan row by id, with the planned meal embedded.
 *
 * @param id Identifier of the plan row.
 * @returns The plan, or `null` when no row has that id.
 */
export async function getPlannedMeal(id: string): Promise<PlannedMeal | null> {
  const row = await getPrisma().planMeal.findUnique({
    where: { id },
    include: planInclude,
  });

  return row ? toPlannedMeal(row) : null;
}

/**
 * Plans a meal into a slot on a day. The position is appended after whatever
 * is already in the slot; the same template may be planned into the same slot
 * on the same day more than once, and each copy gets the next position.
 *
 * @param date The day to plan on, at UTC midnight.
 * @param mealSlotId The Goals slot to fill.
 * @param mealId The template to plan.
 */
export async function assignMeal(
  date: Date,
  mealSlotId: string,
  mealId: string,
): Promise<void> {
  const sortOrder = await getPrisma().planMeal.count({
    where: { date, mealSlotId },
  });

  await getPrisma().planMeal.create({
    data: { date, mealSlotId, mealId, sortOrder },
  });
}

/**
 * Removes a plan row.
 *
 * @param planMealId Identifier of the plan row to remove.
 * @throws {Error} If no plan has that id.
 */
export async function removePlannedMeal(planMealId: string): Promise<void> {
  try {
    await getPrisma().planMeal.delete({ where: { id: planMealId } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new Error(`Unknown plan meal: ${planMealId}`);
    }

    throw error;
  }
}

/**
 * Lists the days on which a meal slot still has a plan, from a date onwards.
 * The Goals save flow uses it to refuse deleting a slot whose forward plans
 * would otherwise be cascaded away.
 *
 * @param mealSlotId Identifier of the Goals slot.
 * @param fromDate First day to include, at UTC midnight; defaults to today.
 * @returns The matching day keys, `YYYY-MM-DD`, oldest first.
 */
export async function listPlansForSlot(
  mealSlotId: string,
  fromDate: Date = dbDateFromKey(todayKey()),
): Promise<string[]> {
  const rows = await getPrisma().planMeal.findMany({
    where: { mealSlotId, date: { gte: fromDate } },
    select: { date: true },
    orderBy: { date: "asc" },
  });

  return rows.map((row) => keyFromDbDate(row.date));
}
