"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { IngredientInUseError } from "@/lib/ingredients/errors";
import type {
  IngredientDeleteState,
  IngredientFieldErrors,
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
 * Validates a hidden-field submission of one OpenFoodFacts search result. The
 * macros are optional because a product can be missing any of them; missing
 * values are stored as `0` by the action.
 */
const foodfactsImportSchema = z.object({
  productName: z.string().trim().min(1),
  brand: z.string().optional().nullable(),
  caloriesPer100g: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }, z.number().min(0).max(900).nullable()),
  proteinPer100g: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }, z.number().min(0).max(100).nullable()),
  carbsPer100g: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }, z.number().min(0).max(100).nullable()),
  fatPer100g: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }, z.number().min(0).max(100).nullable()),
});

/**
 * Builds the ingredient name for an imported product, appending the brand in
 * parentheses when it adds information and is not already part of the name.
 *
 * @param productName Product name from OpenFoodFacts.
 * @param brand Brand from OpenFoodFacts, if any.
 * @returns The name to store, e.g. `Almond Butter (BrandCo)`.
 */
function buildName(productName: string, brand?: string | null): string {
  const trimmedName = productName.trim();
  const trimmedBrand = brand?.trim();

  if (
    trimmedBrand &&
    trimmedName.toLowerCase() !== trimmedBrand.toLowerCase() &&
    !trimmedName.includes(trimmedBrand)
  ) {
    return `${trimmedName} (${trimmedBrand})`;
  }

  return trimmedName;
}

/**
 * Server action behind the import button of an OpenFoodFacts search result.
 * Validates the hidden fields, stores the ingredient with the macros it has,
 * and refreshes the route so the library shows it.
 *
 * @param previousState State returned by the previous submit.
 * @param formData Submission carrying the OpenFoodFacts product fields.
 * @returns An error state with a form message, or a success state carrying the
 * saved name and a bumped reset key.
 */
export async function createIngredientFromFoodfactsAction(
  previousState: IngredientFormState,
  formData: FormData,
): Promise<IngredientFormState> {
  const result = foodfactsImportSchema.safeParse({
    productName: formData.get("productName"),
    brand: formData.get("brand"),
    caloriesPer100g: formData.get("caloriesPer100g"),
    proteinPer100g: formData.get("proteinPer100g"),
    carbsPer100g: formData.get("carbsPer100g"),
    fatPer100g: formData.get("fatPer100g"),
  });

  if (!result.success) {
    return {
      ...previousState,
      status: "error",
      formError: "Invalid import data",
    };
  }

  const data = result.data;
  const name = buildName(data.productName, data.brand);

  try {
    const ingredient = await createIngredient({
      name,
      caloriesPer100g: data.caloriesPer100g ?? 0,
      proteinPer100g: data.proteinPer100g ?? 0,
      carbsPer100g: data.carbsPer100g ?? 0,
      fatPer100g: data.fatPer100g ?? 0,
    });
    refresh();

    return {
      status: "success",
      resetKey: previousState.resetKey + 1,
      savedName: ingredient.name,
    };
  } catch (error) {
    console.error("Could not save ingredient from OpenFoodFacts", error);
    return {
      ...previousState,
      status: "error",
      formError: "The ingredient could not be saved. Please try again.",
    };
  }
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
      fieldErrors: z.flattenError(result.error)
        .fieldErrors as IngredientFieldErrors,
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
      fieldErrors: z.flattenError(result.error)
        .fieldErrors as IngredientFieldErrors,
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
    // Meals still reference the ingredient: an expected refusal, so it gets
    // the explaining message and no "could not delete" log line.
    if (error instanceof IngredientInUseError) {
      const mealCount = error.mealCount;
      const noun = mealCount === 1 ? "meal" : "meals";

      return {
        ...previousState,
        status: "error",
        formError: `This ingredient is used in ${mealCount} ${noun}. Remove it from them first.`,
      };
    }

    console.error("Could not delete the ingredient", error);

    return {
      ...previousState,
      status: "error",
      formError: "The ingredient could not be deleted. Please try again.",
    };
  }
}
