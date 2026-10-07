import type { Ingredient } from "@/lib/ingredients/types";

/**
 * The fields a user provides when creating or editing a meal: a name plus one
 * quantity per ingredient. Totals are never stored; they are always computed
 * from the items and the current ingredient macros.
 */
export type NewMeal = {
  /** Display name of the template, e.g. "Oatmeal & Protein Bowl". */
  name: string;
  /** The ingredients of the meal, in the order they were added. */
  items: NewMealItem[];
};

/** One ingredient of a meal: which ingredient, and how much of it. */
export type NewMealItem = {
  /** Identifier of the ingredient this row points at. */
  ingredientId: string;
  /** Quantity of that ingredient the meal uses, in grams. */
  grams: number;
};

/** A stored meal item: the submitted values plus identity and position. */
export type MealItem = NewMealItem & {
  /** Identifier generated on create. */
  id: string;
  /** Position of the row within its meal, preserving the builder's order. */
  sortOrder: number;
  /**
   * The referenced ingredient, embedded so totals and labels can be rendered
   * without a second query per meal.
   */
  ingredient: Ingredient;
};

/** A stored meal: its identity plus its ordered items. */
export type Meal = {
  /** Identifier generated on create and used to address the meal. */
  id: string;
  /** Display name of the template. */
  name: string;
  /** ISO 8601 creation timestamp, used to order the library newest first. */
  createdAt: string;
  /** The ingredients that make up the meal, ordered by `sortOrder`. */
  items: MealItem[];
};
