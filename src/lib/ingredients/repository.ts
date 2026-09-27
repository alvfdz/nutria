import "server-only";

import { connection } from "next/server";

import { insertIngredient, readIngredients } from "./memory-store";
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
