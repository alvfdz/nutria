import { refresh } from "next/cache";

import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  createIngredientAction,
  createIngredientFromFoodfactsAction,
  deleteIngredientAction,
  updateIngredientAction,
} from "@/app/ingredients/actions";
import { IngredientInUseError } from "@/lib/ingredients/errors";
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

  test("explains how many meals still use the ingredient", async () => {
    vi.mocked(deleteIngredient).mockRejectedValue(new IngredientInUseError(3));

    const state = await deleteIngredientAction(
      initialIngredientDeleteState,
      makeIngredientFormData({ id: "cod" }),
    );

    expect(state).toMatchObject({
      status: "error",
      formError:
        "This ingredient is used in 3 meals. Remove it from them first.",
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("createIngredientFromFoodfactsAction", () => {
  /**
   * Builds the hidden-field submission an import button sends.
   *
   * @param overrides Fields to override on the defaults.
   * @returns The form data for the action.
   */
  function importFormData(overrides: Record<string, string> = {}): FormData {
    const formData = new FormData();
    const fields: Record<string, string> = {
      productName: "Almond Butter",
      brand: "BrandCo",
      caloriesPer100g: "567",
      proteinPer100g: "21.2",
      carbsPer100g: "18.7",
      fatPer100g: "49.4",
      ...overrides,
    };

    for (const [key, value] of Object.entries(fields)) {
      formData.set(key, value);
    }

    return formData;
  }

  test("stores the macros and names the ingredient after product and brand", async () => {
    vi.mocked(createIngredient).mockResolvedValue({
      id: "new-1",
      name: "Almond Butter (BrandCo)",
      caloriesPer100g: 567,
      proteinPer100g: 21.2,
      carbsPer100g: 18.7,
      fatPer100g: 49.4,
      createdAt: new Date().toISOString(),
    });

    const state = await createIngredientFromFoodfactsAction(
      initialIngredientFormState,
      importFormData(),
    );

    expect(createIngredient).toHaveBeenCalledWith({
      name: "Almond Butter (BrandCo)",
      caloriesPer100g: 567,
      proteinPer100g: 21.2,
      carbsPer100g: 18.7,
      fatPer100g: 49.4,
    });
    expect(refresh).toHaveBeenCalled();
    expect(state).toMatchObject({
      status: "success",
      savedName: "Almond Butter (BrandCo)",
    });
  });

  test("omits the brand from the name when it adds nothing", async () => {
    vi.mocked(createIngredient).mockResolvedValue({
      id: "new-2",
      name: "Almond Butter",
      caloriesPer100g: 0,
      proteinPer100g: 0,
      carbsPer100g: 0,
      fatPer100g: 0,
      createdAt: new Date().toISOString(),
    });

    await createIngredientFromFoodfactsAction(
      initialIngredientFormState,
      importFormData({ brand: "" }),
    );

    expect(createIngredient).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Almond Butter" }),
    );
  });

  test("stores missing macros as zero", async () => {
    vi.mocked(createIngredient).mockResolvedValue({
      id: "new-2",
      name: "Almond Butter (BrandCo)",
      caloriesPer100g: 0,
      proteinPer100g: 0,
      carbsPer100g: 0,
      fatPer100g: 0,
      createdAt: new Date().toISOString(),
    });

    await createIngredientFromFoodfactsAction(
      initialIngredientFormState,
      importFormData({
        caloriesPer100g: "",
        proteinPer100g: "",
        carbsPer100g: "",
        fatPer100g: "",
      }),
    );

    expect(createIngredient).toHaveBeenCalledWith(
      expect.objectContaining({
        caloriesPer100g: 0,
        proteinPer100g: 0,
        carbsPer100g: 0,
        fatPer100g: 0,
      }),
    );
  });

  test("rejects an import with no product name", async () => {
    const state = await createIngredientFromFoodfactsAction(
      initialIngredientFormState,
      importFormData({ productName: "" }),
    );

    expect(state.status).toBe("error");
    expect(createIngredient).not.toHaveBeenCalled();
  });

  test("returns a form error when the repository throws", async () => {
    vi.mocked(createIngredient).mockRejectedValue(new Error("boom"));

    const state = await createIngredientFromFoodfactsAction(
      initialIngredientFormState,
      importFormData(),
    );

    expect(state).toMatchObject({
      status: "error",
      formError: "The ingredient could not be saved. Please try again.",
    });
  });
});
