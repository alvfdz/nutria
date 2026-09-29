import { refresh } from "next/cache";

import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  createIngredientAction,
  deleteIngredientAction,
  updateIngredientAction,
} from "@/app/ingredients/actions";
import {
  initialIngredientDeleteState,
  initialIngredientFormState,
} from "@/lib/ingredients/form-state";
import {
  createIngredient,
  deleteIngredient,
  updateIngredient,
} from "@/lib/ingredients/repository";
import {
  ingredientDefaults,
  makeIngredient,
  makeIngredientFormData,
  makeValidIngredientFormData,
} from "@test/factories";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/ingredients/repository", () => ({
  createIngredient: vi.fn(),
  updateIngredient: vi.fn(),
  deleteIngredient: vi.fn(),
}));

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createIngredientAction", () => {
  test("stores the parsed values and reports the saved name", async () => {
    vi.mocked(createIngredient).mockResolvedValue(
      makeIngredient({ id: "new-1" }),
    );

    const state = await createIngredientAction(
      initialIngredientFormState,
      makeValidIngredientFormData({ caloriesPer100g: " 12.5 " }),
    );

    expect(createIngredient).toHaveBeenCalledWith({
      ...ingredientDefaults,
      caloriesPer100g: 12.5,
    });
    expect(refresh).toHaveBeenCalledOnce();
    expect(state).toEqual({
      status: "success",
      resetKey: 1,
      savedName: ingredientDefaults.name,
    });
  });

  test("bumps the reset key relative to the previous state", async () => {
    vi.mocked(createIngredient).mockResolvedValue(makeIngredient());

    const state = await createIngredientAction(
      { ...initialIngredientFormState, resetKey: 7 },
      makeValidIngredientFormData(),
    );

    expect(state.resetKey).toBe(8);
  });

  test("returns field errors and never touches the repository", async () => {
    const state = await createIngredientAction(
      initialIngredientFormState,
      makeValidIngredientFormData({ name: "  ", caloriesPer100g: "" }),
    );

    expect(state.status).toBe("error");
    expect(state.formError).toBeUndefined();
    expect(state.fieldErrors).toMatchObject({
      name: ["Name is required"],
      caloriesPer100g: ["Calories is required"],
    });
    expect(createIngredient).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  test("returns a form error when the repository throws", async () => {
    vi.mocked(createIngredient).mockRejectedValue(new Error("database down"));

    const state = await createIngredientAction(
      initialIngredientFormState,
      makeValidIngredientFormData(),
    );

    expect(state).toMatchObject({
      status: "error",
      formError: "The ingredient could not be saved. Please try again.",
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("updateIngredientAction", () => {
  test("updates the ingredient named by the hidden id field", async () => {
    vi.mocked(updateIngredient).mockResolvedValue(
      makeIngredient({ id: "cod", name: "Cod" }),
    );

    const state = await updateIngredientAction(
      initialIngredientFormState,
      makeValidIngredientFormData({ id: "cod" }),
    );

    expect(updateIngredient).toHaveBeenCalledWith("cod", ingredientDefaults);
    expect(refresh).toHaveBeenCalledOnce();
    expect(state).toEqual({
      status: "success",
      resetKey: 1,
      savedName: "Cod",
    });
  });

  test.each([
    ["a missing id", null],
    ["an empty id", ""],
  ])("refuses to run with %s", async (_case, id) => {
    const state = await updateIngredientAction(
      initialIngredientFormState,
      makeValidIngredientFormData({ id }),
    );

    expect(state).toMatchObject({
      status: "error",
      formError: "The ingredient could not be saved. Please try again.",
    });
    expect(updateIngredient).not.toHaveBeenCalled();
  });

  test("returns field errors for an invalid submission", async () => {
    const state = await updateIngredientAction(
      initialIngredientFormState,
      makeValidIngredientFormData({ id: "cod", fatPer100g: "-1" }),
    );

    expect(state.fieldErrors).toMatchObject({
      fatPer100g: ["Fat cannot be negative"],
    });
    expect(updateIngredient).not.toHaveBeenCalled();
  });

  test("returns a form error when the repository throws", async () => {
    vi.mocked(updateIngredient).mockRejectedValue(
      new Error("Unknown ingredient: cod"),
    );

    const state = await updateIngredientAction(
      initialIngredientFormState,
      makeValidIngredientFormData({ id: "cod" }),
    );

    expect(state).toMatchObject({
      status: "error",
      formError: "The ingredient could not be saved. Please try again.",
    });
  });
});

describe("deleteIngredientAction", () => {
  test("deletes the ingredient and echoes the name back", async () => {
    vi.mocked(deleteIngredient).mockResolvedValue(undefined);

    const state = await deleteIngredientAction(
      initialIngredientDeleteState,
      makeIngredientFormData({ id: "cod", name: "Cod" }),
    );

    expect(deleteIngredient).toHaveBeenCalledWith("cod");
    expect(refresh).toHaveBeenCalledOnce();
    expect(state).toEqual({ status: "success", deletedName: "Cod" });
  });

  test("falls back to an empty name when the hidden field is not a string", async () => {
    vi.mocked(deleteIngredient).mockResolvedValue(undefined);

    const formData = makeIngredientFormData({ id: "cod" });
    formData.set("name", new File(["cod"], "cod.txt"));

    const state = await deleteIngredientAction(
      initialIngredientDeleteState,
      formData,
    );

    expect(state).toEqual({ status: "success", deletedName: "" });
  });

  test("refuses to run without an id", async () => {
    const state = await deleteIngredientAction(
      initialIngredientDeleteState,
      makeIngredientFormData({ name: "Cod" }),
    );

    expect(state).toMatchObject({
      status: "error",
      formError: "The ingredient could not be deleted. Please try again.",
    });
    expect(deleteIngredient).not.toHaveBeenCalled();
  });

  test("returns a form error when the repository throws", async () => {
    vi.mocked(deleteIngredient).mockRejectedValue(
      new Error("Unknown ingredient: cod"),
    );

    const state = await deleteIngredientAction(
      initialIngredientDeleteState,
      makeIngredientFormData({ id: "cod" }),
    );

    expect(state).toMatchObject({
      status: "error",
      formError: "The ingredient could not be deleted. Please try again.",
    });
  });
});
