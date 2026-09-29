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

/**
 * Reads the ingredient form out of a submission and validates it.
 *
 * @param formData Submission of the create or edit form.
 * @returns The parsed values, or a failure carrying per-field messages.
 */
function parseIngredientFormData(formData: FormData) {
  return ingredientSchema.safeParse({
    name: formData.get("name"),
    caloriesPer100g: formData.get("caloriesPer100g"),
    proteinPer100g: formData.get("proteinPer100g"),
    carbsPer100g: formData.get("carbsPer100g"),
    fatPer100g: formData.get("fatPer100g"),
  });
}

/**
 * Reads the hidden `id` field that identifies the ingredient to mutate.
 *
 * @param formData Submission of the edit or delete form.
 * @returns The id, or `null` when it is missing or empty.
 */
function readIngredientId(formData: FormData): string | null {
  const id = formData.get("id");
  return typeof id === "string" && id !== "" ? id : null;
}

/**
 * Server action behind the "New ingredient" form. Validates the submission,
 * stores the ingredient, and refreshes the current route so the library shows
 * it.
 *
 * @param previousState State returned by the previous submit.
 * @param formData Submission of the form.
 * @returns An error state with field or form messages, or a success state
 * carrying the saved name and a bumped reset key.
 */
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

/**
 * Server action behind the edit dialog. Validates the submission, updates the
 * ingredient identified by the hidden `id` field, and refreshes the route.
 *
 * @param previousState State returned by the previous submit.
 * @param formData Submission of the form.
 * @returns An error state with field or form messages, or a success state
 * carrying the saved name and a bumped reset key.
 */
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

/**
 * Server action behind the delete confirmation. The ingredient name travels
 * back in a hidden field so the client can announce it to screen readers
 * without re-reading the store.
 *
 * @param previousState State returned by the previous submit.
 * @param formData Submission of the form.
 * @returns An error state, or a success state carrying the deleted name.
 */
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
