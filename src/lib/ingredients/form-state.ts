import type { IngredientInput } from "./schema";

export type IngredientFieldErrors = Partial<
  Record<keyof IngredientInput, string[] | undefined>
>;

export type IngredientFormState = {
  status: "idle" | "error" | "success";
  resetKey: number;
  fieldErrors?: IngredientFieldErrors;
  formError?: string;
  savedName?: string;
};

export const initialIngredientFormState: IngredientFormState = {
  status: "idle",
  resetKey: 0,
};
