import "server-only";

import type { Ingredient, NewIngredient } from "./types";

const globalForIngredients = globalThis as typeof globalThis & {
  __nutriaIngredients?: Ingredient[];
};

/**
 * Returns the process-wide ingredient array, creating it on first use. It hangs
 * off `globalThis` so the data survives hot reloads in development.
 */
function store(): Ingredient[] {
  globalForIngredients.__nutriaIngredients ??= [];
  return globalForIngredients.__nutriaIngredients;
}

/**
 * Appends an ingredient to the store.
 *
 * @param ingredient Fully built ingredient, including id and timestamp.
 */
export function insertIngredient(ingredient: Ingredient): void {
  store().push(ingredient);
}

/**
 * Replaces the editable fields of an ingredient, keeping its id and creation
 * timestamp.
 *
 * @param id Identifier of the ingredient to update.
 * @param patch New values for every user-editable field.
 * @returns The updated ingredient, or `null` when no ingredient has that id.
 */
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

/**
 * Removes an ingredient from the store.
 *
 * @param id Identifier of the ingredient to remove.
 * @returns `true` when an ingredient was removed, `false` when the id is
 * unknown.
 */
export function deleteIngredient(id: string): boolean {
  const ingredients = store();
  const remaining = ingredients.filter((ingredient) => ingredient.id !== id);
  if (remaining.length === ingredients.length) return false;

  ingredients.splice(0, ingredients.length, ...remaining);

  return true;
}

/**
 * Reads every stored ingredient, newest first, so the library renders
 * additions at the top.
 *
 * @returns A new array; the store itself is not exposed.
 */
export function readIngredients(): Ingredient[] {
  return store().toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
}
