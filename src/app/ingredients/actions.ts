"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import type { IngredientFormState } from "@/lib/ingredients/form-state";
import { createIngredient } from "@/lib/ingredients/repository";
import { ingredientSchema } from "@/lib/ingredients/schema";

export async function createIngredientAction(
  previousState: IngredientFormState,
  formData: FormData,
): Promise<IngredientFormState> {
  const result = ingredientSchema.safeParse({
    name: formData.get("name"),
    caloriesPer100g: formData.get("caloriesPer100g"),
    proteinPer100g: formData.get("proteinPer100g"),
    carbsPer100g: formData.get("carbsPer100g"),
    fatPer100g: formData.get("fatPer100g"),
  });

  if (!result.success) {
    return {
      ...previousState,
      status: "error",
      fieldErrors: z.flattenError(result.error).fieldErrors,
      formError: undefined,
    };
  }

  try {
    const ingredient = await createIngredient(result.data);
    refresh();

    return {
      status: "success",
      resetKey: previousState.resetKey + 1,
      savedName: ingredient.name,
    };
  } catch (error) {
    console.error("Could not save the ingredient", error);

    return {
      ...previousState,
      status: "error",
      formError: "The ingredient could not be saved. Please try again.",
    };
  }
}
