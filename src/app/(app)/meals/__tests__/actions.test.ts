import { refresh } from "next/cache";

import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  createMealAction,
  deleteMealAction,
  updateMealAction,
} from "@/app/(app)/meals/actions";
import { requireUser } from "@/lib/auth/session";
import { MealInUseError, UnknownIngredientError } from "@/lib/meals/errors";
import {
  initialMealDeleteState,
  initialMealFormState,
} from "@/lib/meals/form-state";
import { createMeal, deleteMeal, updateMeal } from "@/lib/meals/repository";
import {
  makeMeal,
  makeMealFormData,
  makeValidMealFormData,
  mealDefaults,
  testUser,
} from "@test/factories";

vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
  getCurrentUser: vi.fn(),
}));
vi.mock("@/lib/meals/repository", () => ({
  createMeal: vi.fn(),
  updateMeal: vi.fn(),
  deleteMeal: vi.fn(),
}));

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(requireUser).mockResolvedValue(testUser);
});

describe("when signed out", () => {
  /** What `redirect("/login")` throws inside `requireUser`. */
  const redirectToLogin = new Error("NEXT_REDIRECT");

  beforeEach(() => {
    vi.mocked(requireUser).mockRejectedValue(redirectToLogin);
  });

  test("every action lets the login redirect through and writes nothing", async () => {
    const form = makeValidMealFormData();
    form.set("id", "meal-9");

    await expect(createMealAction(initialMealFormState, form)).rejects.toBe(
      redirectToLogin,
    );
    await expect(updateMealAction(initialMealFormState, form)).rejects.toBe(
      redirectToLogin,
    );
    await expect(deleteMealAction(initialMealDeleteState, form)).rejects.toBe(
      redirectToLogin,
    );

    expect(createMeal).not.toHaveBeenCalled();
    expect(updateMeal).not.toHaveBeenCalled();
    expect(deleteMeal).not.toHaveBeenCalled();
  });
});

describe("createMealAction", () => {
  test("stores the parsed values for the signed-in user and reports the saved name", async () => {
    vi.mocked(createMeal).mockResolvedValue(makeMeal({ id: "new-1" }));

    const state = await createMealAction(
      initialMealFormState,
      makeValidMealFormData({ name: `  ${mealDefaults.name}  ` }, [
        { ingredientId: mealDefaults.items[0].ingredientId, grams: " 80 " },
        { ingredientId: mealDefaults.items[1].ingredientId, grams: "200.5" },
      ]),
    );

    expect(createMeal).toHaveBeenCalledWith(testUser.id, {
      name: mealDefaults.name,
      items: [
        { ingredientId: mealDefaults.items[0].ingredientId, grams: 80 },
        { ingredientId: mealDefaults.items[1].ingredientId, grams: 200.5 },
      ],
    });
    expect(refresh).toHaveBeenCalledOnce();
    expect(state).toEqual({
      status: "success",
      resetKey: 1,
      savedName: mealDefaults.name,
    });
  });

  test("bumps the reset key relative to the previous state", async () => {
    vi.mocked(createMeal).mockResolvedValue(makeMeal());

    const state = await createMealAction(
      { ...initialMealFormState, resetKey: 7 },
      makeValidMealFormData(),
    );

    expect(state.resetKey).toBe(8);
  });

  test("returns field errors and never touches the repository", async () => {
    const state = await createMealAction(
      initialMealFormState,
      makeValidMealFormData({ name: "  " }, [
        { ingredientId: null, grams: "" },
      ]),
    );

    expect(state.status).toBe("error");
    expect(state.formError).toBeUndefined();
    expect(state.fieldErrors).toMatchObject({
      name: ["Name is required"],
      "items.0.grams": ["Grams is required"],
    });
    expect(createMeal).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  test("returns a form error when the repository throws", async () => {
    vi.mocked(createMeal).mockRejectedValue(new Error("database down"));

    const state = await createMealAction(
      initialMealFormState,
      makeValidMealFormData(),
    );

    expect(state).toMatchObject({
      status: "error",
      formError: "The meal could not be saved. Please try again.",
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  test("explains when the submission references a vanished ingredient", async () => {
    vi.mocked(createMeal).mockRejectedValue(new UnknownIngredientError());

    const state = await createMealAction(
      initialMealFormState,
      makeValidMealFormData(),
    );

    expect(state).toMatchObject({
      status: "error",
      formError:
        "That ingredient no longer exists. Reload the page and try again.",
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("updateMealAction", () => {
  test("updates the meal named by the hidden id field", async () => {
    vi.mocked(updateMeal).mockResolvedValue(
      makeMeal({ id: "meal-9", name: "Porridge" }),
    );

    const state = await updateMealAction(
      initialMealFormState,
      makeValidMealFormData({ id: "meal-9" }),
    );

    expect(updateMeal).toHaveBeenCalledWith(
      testUser.id,
      "meal-9",
      mealDefaults,
    );
    expect(refresh).toHaveBeenCalledOnce();
    expect(state).toEqual({
      status: "success",
      resetKey: 1,
      savedName: "Porridge",
    });
  });

  test.each([
    ["a missing id", null],
    ["an empty id", ""],
  ])("refuses to run with %s", async (_case, id) => {
    const state = await updateMealAction(
      initialMealFormState,
      makeValidMealFormData({ id }),
    );

    expect(state).toMatchObject({
      status: "error",
      formError: "The meal could not be saved. Please try again.",
    });
    expect(updateMeal).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  test("returns field errors for an invalid submission", async () => {
    const state = await updateMealAction(
      initialMealFormState,
      makeValidMealFormData({ id: "meal-9" }, [
        { ingredientId: mealDefaults.items[0].ingredientId, grams: "0" },
      ]),
    );

    expect(state.status).toBe("error");
    expect(state.formError).toBeUndefined();
    expect(state.fieldErrors).toMatchObject({
      "items.0.grams": ["Grams must be greater than 0"],
    });
    expect(updateMeal).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  test("returns a form error when the repository throws", async () => {
    vi.mocked(updateMeal).mockRejectedValue(new Error("Unknown meal: meal-9"));

    const state = await updateMealAction(
      initialMealFormState,
      makeValidMealFormData({ id: "meal-9" }),
    );

    expect(state).toMatchObject({
      status: "error",
      formError: "The meal could not be saved. Please try again.",
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  test("explains when the submission references a vanished ingredient", async () => {
    vi.mocked(updateMeal).mockRejectedValue(new UnknownIngredientError());

    const state = await updateMealAction(
      initialMealFormState,
      makeValidMealFormData({ id: "meal-9" }),
    );

    expect(state).toMatchObject({
      status: "error",
      formError:
        "That ingredient no longer exists. Reload the page and try again.",
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("deleteMealAction", () => {
  test("deletes the meal and echoes the name back", async () => {
    vi.mocked(deleteMeal).mockResolvedValue(undefined);

    const state = await deleteMealAction(
      initialMealDeleteState,
      makeMealFormData({ id: "meal-9", name: "Porridge" }),
    );

    expect(deleteMeal).toHaveBeenCalledWith(testUser.id, "meal-9");
    expect(refresh).toHaveBeenCalledOnce();
    expect(state).toEqual({ status: "success", deletedName: "Porridge" });
  });

  test("falls back to an empty name when the hidden field is not a string", async () => {
    vi.mocked(deleteMeal).mockResolvedValue(undefined);

    const formData = makeMealFormData({ id: "meal-9" });
    formData.set("name", new File(["Porridge"], "porridge.txt"));

    const state = await deleteMealAction(initialMealDeleteState, formData);

    expect(state).toEqual({ status: "success", deletedName: "" });
  });

  test("refuses to run without an id", async () => {
    const state = await deleteMealAction(
      initialMealDeleteState,
      makeMealFormData({ name: "Porridge" }),
    );

    expect(state).toMatchObject({
      status: "error",
      formError: "The meal could not be deleted. Please try again.",
    });
    expect(deleteMeal).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  test("returns a form error when the repository throws", async () => {
    vi.mocked(deleteMeal).mockRejectedValue(new Error("Unknown meal: meal-9"));

    const state = await deleteMealAction(
      initialMealDeleteState,
      makeMealFormData({ id: "meal-9", name: "Porridge" }),
    );

    expect(state).toMatchObject({
      status: "error",
      formError: "The meal could not be deleted. Please try again.",
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  test("explains that a meal with forward plans cannot be deleted", async () => {
    vi.mocked(deleteMeal).mockRejectedValue(new MealInUseError(["2026-10-20"]));

    const state = await deleteMealAction(
      initialMealDeleteState,
      makeMealFormData({ id: "meal-9", name: "Porridge" }),
    );

    expect(state).toMatchObject({
      status: "error",
      formError:
        "This meal is still planned on Tue 20. Remove those plans before deleting it.",
    });
    expect(refresh).not.toHaveBeenCalled();
  });
});
