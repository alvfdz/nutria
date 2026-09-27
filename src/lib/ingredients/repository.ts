import "server-only";

import { connection } from "next/server";

import {
  deleteIngredient as deleteStoredIngredient,
  insertIngredient,
  readIngredients,
  updateIngredient as updateStoredIngredient,
} from "./memory-store";
import type { Ingredient, NewIngredient } from "./types";

export async function createIngredient(input: NewIngredient): Promise<Ingredient> {
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

export async function listIngredients(): Promise<Ingredient[]> {
  // The store lives in this process, so the route must render per request
  // instead of being frozen into the build output.
  await connection();

  return readIngredients();
}

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

export async function deleteIngredient(id: string): Promise<void> {
  // TODO(db): replace the in-memory delete with the Prisma write once
  // PostgreSQL is wired up (docs/vision.md, Data Persistence Layer):
  //   await prisma.ingredient.delete({ where: { id } });
  if (!deleteStoredIngredient(id)) {
    throw new Error(`Unknown ingredient: ${id}`);
  }
}
