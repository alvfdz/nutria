import "server-only";

import { connection } from "next/server";

import {
  type Ingredient as IngredientDbRow,
  type Meal as MealDbRow,
  type MealItem as MealItemDbRow,
  Prisma,
} from "@/generated/prisma/client";
import { dbDateFromKey, keyFromDbDate, todayKey } from "@/lib/calendar/week";
import { getPrisma } from "@/lib/db/prisma";
import { MealInUseError, UnknownIngredientError } from "./errors";
import type { Meal, NewMeal } from "./types";

/** A meal row as `listMeals` asks for it: ordered items with their ingredients. */
export type MealWithItems = MealDbRow & {
  items: (MealItemDbRow & { ingredient: IngredientDbRow })[];
};

/**
 * What every meal read embeds: the items ordered the way the builder added
 * them, plus the ingredient behind each row so labels and totals need no
 * second query.
 */
export const mealInclude = {
  items: {
    include: { ingredient: true },
    orderBy: { sortOrder: "asc" as const },
  },
};

/**
 * Maps a Prisma error onto the plain errors the server actions expect.
 *
 * - `P2025` ("record not found") is the unknown-meal case: `id` is present for
 *   every write addressed to an existing row, so the message can name it.
 * - `P2003` ("foreign key constraint failed") means a row referenced an
 *   `ingredientId` that no longer exists, which the actions translate into a
 *   specific form message.
 *
 * @param error Whatever the query threw.
 * @param id Identifier the query was addressed to, when there was one.
 * @throws {UnknownIngredientError} When `error` is a `P2003`.
 * @throws {Error} `Unknown meal: <id>` when `error` is a `P2025`.
 * The original error otherwise.
 */
function rethrowMealWriteError(error: unknown, id?: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") {
      throw new UnknownIngredientError();
    }

    if (error.code === "P2025" && id !== undefined) {
      throw new Error(`Unknown meal: ${id}`);
    }
  }

  throw error;
}

/**
 * Stamps a Prisma row as a {@link Meal}. Prisma returns every timestamp as a
 * `Date`, which the domain types carry as ISO 8601 strings — including the
 * `createdAt` of each embedded ingredient.
 *
 * @param row The row as Prisma returns it.
 * @returns The same row in the shape the app uses.
 */
export function toMeal(row: MealWithItems): Meal {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    items: row.items.map((item) => ({
      ...item,
      ingredient: {
        ...item.ingredient,
        createdAt: item.ingredient.createdAt.toISOString(),
      },
    })),
  };
}

/**
 * Creates a meal with its items in one transaction; `sortOrder` records the
 * order the rows were added in and the database assigns the ids.
 *
 * @param input Validated meal name and items.
 * @returns The stored meal, items and ingredients embedded.
 * @throws {UnknownIngredientError} If an item references a missing ingredient.
 */
export async function createMeal(input: NewMeal): Promise<Meal> {
  try {
    const row = await getPrisma().meal.create({
      data: {
        name: input.name,
        items: {
          create: input.items.map((item, index) => ({
            ...item,
            sortOrder: index,
          })),
        },
      },
      include: mealInclude,
    });

    return toMeal(row);
  } catch (error) {
    rethrowMealWriteError(error);
  }
}

/**
 * Lists every meal, newest first, each with its ordered items and the
 * ingredient behind every row.
 *
 * @returns The stored meals.
 */
export async function listMeals(): Promise<Meal[]> {
  // Nothing else in this read touches Request-time APIs, so without this the
  // query would run while prerendering and get frozen into the build output.
  await connection();

  const rows = await getPrisma().meal.findMany({
    include: mealInclude,
    orderBy: { createdAt: "desc" },
  });

  return rows.map(toMeal);
}

/**
 * Updates an existing meal's name and replaces its items with the submitted
 * ones. Prisma runs the nested `deleteMany` + `create` inside one transaction,
 * so a failure leaves the previous items in place rather than half-updated.
 *
 * @param id Identifier of the meal to update.
 * @param input Validated meal name and items.
 * @returns The updated meal, items and ingredients embedded.
 * @throws {Error} If no meal has that id.
 * @throws {UnknownIngredientError} If an item references a missing ingredient.
 */
export async function updateMeal(id: string, input: NewMeal): Promise<Meal> {
  try {
    const row = await getPrisma().meal.update({
      where: { id },
      data: {
        name: input.name,
        items: {
          deleteMany: {},
          create: input.items.map((item, index) => ({
            ...item,
            sortOrder: index,
          })),
        },
      },
      include: mealInclude,
    });

    return toMeal(row);
  } catch (error) {
    rethrowMealWriteError(error, id);
  }
}

/**
 * Permanently removes a meal. A meal that is still planned on today or a
 * future day cannot be deleted, because that would silently drop it from the
 * forward plan; only plans dated before today are cleared, then the meal
 * itself goes. Its items go with it through the cascade.
 *
 * @param id Identifier of the meal to remove.
 * @throws {MealInUseError} If any plan on today or later still uses the meal.
 * @throws {Error} If no meal has that id.
 */
export async function deleteMeal(id: string): Promise<void> {
  const prisma = getPrisma();
  const today = dbDateFromKey(todayKey());

  const forwardPlans = await prisma.planMeal.findMany({
    where: { mealId: id, date: { gte: today } },
    select: { date: true },
    orderBy: { date: "asc" },
  });

  if (forwardPlans.length > 0) {
    throw new MealInUseError(
      forwardPlans.map((plan) => keyFromDbDate(plan.date)),
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.planMeal.deleteMany({
        where: { mealId: id, date: { lt: today } },
      });
      await tx.meal.delete({ where: { id } });
    });
  } catch (error) {
    rethrowMealWriteError(error, id);
  }
}
