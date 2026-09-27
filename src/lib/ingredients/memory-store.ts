import "server-only";

import type { Ingredient } from "./types";

const globalForIngredients = globalThis as typeof globalThis & {
  __nutriaIngredients?: Ingredient[];
};

function store(): Ingredient[] {
  globalForIngredients.__nutriaIngredients ??= [];
  return globalForIngredients.__nutriaIngredients;
}

export function insertIngredient(ingredient: Ingredient): void {
  store().push(ingredient);
}

export function readIngredients(): Ingredient[] {
  return store().toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
}
