/**
 * The fields a user provides when creating or editing an ingredient. Macro
 * values are densities expressed per 100 g of product, which is how food
 * labels and external databases report them.
 */
export type NewIngredient = {
  /** Display name of the raw food, e.g. "Chicken breast, raw". */
  name: string;
  /** Energy density in kilocalories per 100 g. */
  caloriesPer100g: number;
  /** Protein density in grams per 100 g. */
  proteinPer100g: number;
  /** Carbohydrate density in grams per 100 g. */
  carbsPer100g: number;
  /** Fat density in grams per 100 g. */
  fatPer100g: number;
};

/** A stored ingredient: its user-editable fields plus its identity. */
export type Ingredient = NewIngredient & {
  /** Identifier generated on create and used to address the ingredient. */
  id: string;
  /** ISO 8601 creation timestamp, used to order the library newest first. */
  createdAt: string;
};
