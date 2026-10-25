import "server-only";

import { connection } from "next/server";

import {
  type Ingredient as IngredientRow,
  Prisma,
} from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { IngredientInUseError } from "./errors";
import type { Ingredient, NewIngredient } from "./types";

/**
 * Maps a Prisma error onto the plain `Error` the server actions expect.
 *
 * Prisma reports an unmatched `where` clause as code `P2025` ("record not
 * found"), which is exactly the unknown-ingredient case the actions translate
 * into a user-facing message.
 *
 * @param error Whatever the query threw.
 * @param id Identifier the query was addressed to.
 * @throws {Error} `Unknown ingredient: <id>` when `error` is a `P2025`; the
 * original error otherwise.
 */
function rethrowUnknownIngredient(error: unknown, id: string): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    throw new Error(`Unknown ingredient: ${id}`);
  }

  throw error;
}

/**
 * Stamps a Prisma row as an {@link Ingredient}. Prisma returns `createdAt` as
 * a `Date`, which the domain type carries as an ISO 8601 string. The owning
 * `userId` is left out: callers already scope by it, and components never
 * need it. Exported so meal reads map their embedded ingredients the same way.
 *
 * @param row The row as Prisma returns it.
 * @returns The same row in the shape the app uses.
 */
export function toIngredient(row: IngredientRow): Ingredient {
  return {
    id: row.id,
    name: row.name,
    caloriesPer100g: row.caloriesPer100g,
    proteinPer100g: row.proteinPer100g,
    carbsPer100g: row.carbsPer100g,
    fatPer100g: row.fatPer100g,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Creates an ingredient owned by the user; the database assigns its id and
 * creation timestamp.
 *
 * @param userId Owner of the new ingredient.
 * @param input Validated values for every user-editable field.
 * @returns The stored ingredient.
 */
export async function createIngredient(
  userId: string,
  input: NewIngredient,
): Promise<Ingredient> {
  const row = await getPrisma().ingredient.create({
    data: { ...input, userId },
  });

  return toIngredient(row);
}

/**
 * Lists the user's ingredients, newest first.
 *
 * @param userId Owner whose library to read.
 * @returns The stored ingredients.
 */
export async function listIngredients(userId: string): Promise<Ingredient[]> {
  // Nothing else in this read touches Request-time APIs, so without this the
  // query would run while prerendering and get frozen into the build output.
  await connection();

  const rows = await getPrisma().ingredient.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return rows.map(toIngredient);
}

/**
 * Updates the editable fields of one of the user's ingredients. Another
 * user's ingredient is treated exactly like a missing one.
 *
 * @param userId Owner the ingredient must belong to.
 * @param id Identifier of the ingredient to update.
 * @param input Validated values for every user-editable field.
 * @returns The updated ingredient.
 * @throws {Error} If the user has no ingredient with that id.
 */
export async function updateIngredient(
  userId: string,
  id: string,
  input: NewIngredient,
): Promise<Ingredient> {
  try {
    const row = await getPrisma().ingredient.update({
      where: { id, userId },
      data: input,
    });

    return toIngredient(row);
  } catch (error) {
    rethrowUnknownIngredient(error, id);
  }
}

/**
 * Permanently removes one of the user's ingredients. Another user's
 * ingredient is treated exactly like a missing one.
 *
 * @param userId Owner the ingredient must belong to.
 * @param id Identifier of the ingredient to remove.
 * @throws {IngredientInUseError} If any meal still references the
 * ingredient.
 * @throws {Error} If the user has no ingredient with that id.
 */
export async function deleteIngredient(
  userId: string,
  id: string,
): Promise<void> {
  // Count before deleting so the user gets "used in N meals" rather than the
  // bare foreign-key failure the `Restrict` constraint would otherwise raise.
  // The constraint stays as the backstop for a delete racing a meal insert.
  // Scoped through the ingredient's owner rather than the meal's, so every
  // reference to one of the user's ingredients counts, whoever owns the meal,
  // while another user's ingredient id still counts nothing.
  const mealCount = await getPrisma().mealItem.count({
    where: { ingredientId: id, ingredient: { userId } },
  });

  if (mealCount > 0) {
    throw new IngredientInUseError(mealCount);
  }

  try {
    await getPrisma().ingredient.delete({ where: { id, userId } });
  } catch (error) {
    rethrowUnknownIngredient(error, id);
  }
}
