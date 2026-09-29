import "server-only";

import { connection } from "next/server";

import {
  deleteIngredient as deleteStoredIngredient,
  insertIngredient,
  readIngredients,
  updateIngredient as updateStoredIngredient,
} from "./memory-store";
import type { Ingredient, NewIngredient } from "./types";

/**
 * Creates an ingredient, generating its id and creation timestamp.
 *
 * @param input Validated values for every user-editable field.
 * @returns The stored ingredient.
 */
export async function createIngredient(
  input: NewIngredient,
): Promise<Ingredient> {
  // TODO(db): replace the in-memory insert with the Prisma write once
  // PostgreSQL is wired up (docs/vision.md, Data Persistence Layer):
  //   return prisma.ingredient.create({ data: input });
  const ingredient: Ingredient = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };

  insertIngredient(ingredient);

  return ingredient;
}

/**
 * Lists every ingredient, newest first.
 *
 * @returns The stored ingredients.
 */
export async function listIngredients(): Promise<Ingredient[]> {
  // The store lives in this process, so the route must render per request
  // instead of being frozen into the build output.
  await connection();

  return readIngredients();
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
  // TODO(db): replace the in-memory update with the Prisma write once
  // PostgreSQL is wired up (docs/vision.md, Data Persistence Layer):
  //   return prisma.ingredient.update({ where: { id }, data: input });
  const ingredient = updateStoredIngredient(id, input);
  if (!ingredient) {
    throw new Error(`Unknown ingredient: ${id}`);
  }

  return ingredient;
}

/**
 * Permanently removes an ingredient.
 *
 * @param id Identifier of the ingredient to remove.
 * @throws {Error} If no ingredient has that id.
 */
export async function deleteIngredient(id: string): Promise<void> {
  // TODO(db): replace the in-memory delete with the Prisma write once
  // PostgreSQL is wired up (docs/vision.md, Data Persistence Layer):
  //   await prisma.ingredient.delete({ where: { id } });
  if (!deleteStoredIngredient(id)) {
    throw new Error(`Unknown ingredient: ${id}`);
  }
}
