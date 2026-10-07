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
 * a `Date`, which the domain type carries as an ISO 8601 string.
 *
 * @param row The row as Prisma returns it.
 * @returns The same row in the shape the app uses.
 */
function toIngredient(row: IngredientRow): Ingredient {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

/**
 * Creates an ingredient; the database assigns its id and creation timestamp.
 *
 * @param input Validated values for every user-editable field.
 * @returns The stored ingredient.
 */
export async function createIngredient(
  input: NewIngredient,
): Promise<Ingredient> {
  const row = await getPrisma().ingredient.create({ data: input });

  return toIngredient(row);
}

/**
 * Lists every ingredient, newest first.
 *
 * @returns The stored ingredients.
 */
export async function listIngredients(): Promise<Ingredient[]> {
  // Nothing else in this read touches Request-time APIs, so without this the
  // query would run while prerendering and get frozen into the build output.
  await connection();

  const rows = await getPrisma().ingredient.findMany({
    orderBy: { createdAt: "desc" },
  });

  return rows.map(toIngredient);
}

/**
 * Updates the editable fields of an existing ingredient.
 *
 * @param id Identifier of the ingredient to update.
 * @param input Validated values for every user-editable field.
 * @returns The updated ingredient.
 * @throws {Error} If no ingredient has that id.
 */
export async function updateIngredient(
  id: string,
  input: NewIngredient,
): Promise<Ingredient> {
  try {
    const row = await getPrisma().ingredient.update({
      where: { id },
      data: input,
    });

    return toIngredient(row);
  } catch (error) {
    rethrowUnknownIngredient(error, id);
  }
}

/**
 * Permanently removes an ingredient.
 *
 * @param id Identifier of the ingredient to remove.
 * @throws {IngredientInUseError} If meals still reference the ingredient.
 * @throws {Error} If no ingredient has that id.
 */
export async function deleteIngredient(id: string): Promise<void> {
  // Count before deleting so the user gets "used in N meals" rather than the
  // bare foreign-key failure the `Restrict` constraint would otherwise raise.
  // The constraint stays as the backstop for a delete racing a meal insert.
  const mealCount = await getPrisma().mealItem.count({
    where: { ingredientId: id },
  });

  if (mealCount > 0) {
    throw new IngredientInUseError(mealCount);
  }

  try {
    await getPrisma().ingredient.delete({ where: { id } });
  } catch (error) {
    rethrowUnknownIngredient(error, id);
  }
}
