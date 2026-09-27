export type NewIngredient = {
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

export type Ingredient = NewIngredient & {
  id: string;
  createdAt: string;
};
