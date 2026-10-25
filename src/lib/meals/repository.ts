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
import { toIngredient } from "@/lib/ingredients/repository";
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
 * `createdAt` of each embedded ingredient. The owning `userId` of the meal and
 * of its ingredients is left out, as in `toIngredient`.
 *
 * @param row The row as Prisma returns it.
 * @returns The same row in the shape the app uses.
 */
export function toMeal(row: MealWithItems): Meal {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    items: row.items.map((item) => ({
      ...item,
      ingredient: toIngredient(item.ingredient),
    })),
  };
}

/**
 * Checks that every ingredient a meal submission references belongs to the
 * user. Another user's ingredient is as unusable as a deleted one, so both
 * surface as the same error.
 *
 * @param userId Owner the ingredients must belong to.
 * @param input The meal submission whose items to check.
 * @throws {UnknownIngredientError} If any referenced ingredient is missing or
 * owned by someone else.
 */
async function assertOwnsIngredients(
  userId: string,
  input: NewMeal,
): Promise<void> {
  const ids = [...new Set(input.items.map((item) => item.ingredientId))];
  const owned = await getPrisma().ingredient.count({
    where: { id: { in: ids }, userId },
  });

  if (owned !== ids.length) {
    throw new UnknownIngredientError();
  }
}

/**
 * Creates a meal owned by the user, with its items in one transaction;
 * `sortOrder` records the order the rows were added in and the database
 * assigns the ids.
 *
 * @param userId Owner of the new meal.
 * @param input Validated meal name and items.
 * @returns The stored meal, items and ingredients embedded.
 * @throws {UnknownIngredientError} If an item references an ingredient that
 * is missing or not the user's.
 */
export async function createMeal(
  userId: string,
  input: NewMeal,
): Promise<Meal> {
  await assertOwnsIngredients(userId, input);

  try {
    const row = await getPrisma().meal.create({
      data: {
        name: input.name,
        userId,
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
 * Lists the user's meals, newest first, each with its ordered items and the
 * ingredient behind every row.
 *
 * @param userId Owner whose library to read.
 * @returns The stored meals.
 */
export async function listMeals(userId: string): Promise<Meal[]> {
  // Nothing else in this read touches Request-time APIs, so without this the
  // query would run while prerendering and get frozen into the build output.
  await connection();

  const rows = await getPrisma().meal.findMany({
    where: { userId },
    include: mealInclude,
    orderBy: { createdAt: "desc" },
  });

  return rows.map(toMeal);
}

/**
 * Updates an existing meal's name and replaces its items with the submitted
 * ones. Prisma runs the nested `deleteMany` + `create` inside one transaction,
 * so a failure leaves the previous items in place rather than half-updated.
 * Another user's meal is treated exactly like a missing one.
 *
 * @param userId Owner the meal and its ingredients must belong to.
 * @param id Identifier of the meal to update.
 * @param input Validated meal name and items.
 * @returns The updated meal, items and ingredients embedded.
 * @throws {Error} If the user has no meal with that id.
 * @throws {UnknownIngredientError} If an item references an ingredient that
 * is missing or not the user's.
 */
export async function updateMeal(
  userId: string,
  id: string,
  input: NewMeal,
): Promise<Meal> {
  await assertOwnsIngredients(userId, input);

  try {
    const row = await getPrisma().meal.update({
      where: { id, userId },
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
 * itself goes. Its items go with it through the cascade. Another user's meal
 * is treated exactly like a missing one.
 *
 * @param userId Owner the meal must belong to.
 * @param id Identifier of the meal to remove.
 * @throws {MealInUseError} If any plan on today or later still uses the meal.
 * @throws {Error} If the user has no meal with that id.
 */
export async function deleteMeal(userId: string, id: string): Promise<void> {
  const prisma = getPrisma();
  const today = dbDateFromKey(todayKey());

  const forwardPlans = await prisma.planMeal.findMany({
    where: { userId, mealId: id, date: { gte: today } },
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
        where: { userId, mealId: id, date: { lt: today } },
      });
      await tx.meal.delete({ where: { id, userId } });
    });
  } catch (error) {
    rethrowMealWriteError(error, id);
  }
}
