"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import type {
  IngredientDeleteState,
  IngredientFormState,
} from "@/lib/ingredients/form-state";
import {
  createIngredient,
  deleteIngredient,
  updateIngredient,
} from "@/lib/ingredients/repository";
import { ingredientSchema } from "@/lib/ingredients/schema";

function parseIngredientFormData(formData: FormData) {
  return ingredientSchema.safeParse({
    name: formData.get("name"),
    caloriesPer100g: formData.get("caloriesPer100g"),
    proteinPer100g: formData.get("proteinPer100g"),
    carbsPer100g: formData.get("carbsPer100g"),
    fatPer100g: formData.get("fatPer100g"),
  });
}

function readIngredientId(formData: FormData): string | null {
  const id = formData.get("id");
  return typeof id === "string" && id !== "" ? id : null;
}

export async function createIngredientAction(
  previousState: IngredientFormState,
  formData: FormData,
): Promise<IngredientFormState> {
  const result = parseIngredientFormData(formData);

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

export async function updateIngredientAction(
  previousState: IngredientFormState,
  formData: FormData,
): Promise<IngredientFormState> {
  const id = readIngredientId(formData);
  if (!id) {
    return {
      ...previousState,
      status: "error",
      formError: "The ingredient could not be saved. Please try again.",
    };
  }

  const result = parseIngredientFormData(formData);

  if (!result.success) {
    return {
      ...previousState,
      status: "error",
      fieldErrors: z.flattenError(result.error).fieldErrors,
      formError: undefined,
    };
  }

  try {
    const ingredient = await updateIngredient(id, result.data);
    refresh();

    return {
      status: "success",
      resetKey: previousState.resetKey + 1,
      savedName: ingredient.name,
    };
  } catch (error) {
    console.error("Could not update the ingredient", error);

    return {
      ...previousState,
      status: "error",
      formError: "The ingredient could not be saved. Please try again.",
    };
  }
}

export async function deleteIngredientAction(
  previousState: IngredientDeleteState,
  formData: FormData,
): Promise<IngredientDeleteState> {
  const id = readIngredientId(formData);
  const name = formData.get("name");

  if (!id) {
    return {
      ...previousState,
      status: "error",
      formError: "The ingredient could not be deleted. Please try again.",
    };
  }

  try {
    await deleteIngredient(id);
    refresh();

    return {
      status: "success",
      deletedName: typeof name === "string" ? name : "",
    };
  } catch (error) {
    console.error("Could not delete the ingredient", error);

    return {
      ...previousState,
      status: "error",
      formError: "The ingredient could not be deleted. Please try again.",
    };
  }
}
