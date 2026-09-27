import "server-only";

import type { Ingredient, NewIngredient } from "./types";

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

export function updateIngredient(
  id: string,
  patch: NewIngredient,
): Ingredient | null {
  const ingredients = store();
  const index = ingredients.findIndex((ingredient) => ingredient.id === id);
  if (index === -1) return null;

  const updated: Ingredient = { ...ingredients[index], ...patch };
  ingredients.splice(index, 1, updated);

  return updated;
}

export function deleteIngredient(id: string): boolean {
  const ingredients = store();
  const remaining = ingredients.filter((ingredient) => ingredient.id !== id);
  if (remaining.length === ingredients.length) return false;

  ingredients.splice(0, ingredients.length, ...remaining);

  return true;
}

export function readIngredients(): Ingredient[] {
  return store().toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
}
