import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import MealsPage from "@/app/(app)/meals/page";
import { requireUser } from "@/lib/auth/session";
import { listIngredients } from "@/lib/ingredients/repository";
import type { Ingredient } from "@/lib/ingredients/types";
import { listMeals } from "@/lib/meals/repository";
import type { Meal } from "@/lib/meals/types";
import { makeIngredient, makeMeal, testUser } from "@test/factories";

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
  getCurrentUser: vi.fn(),
}));
vi.mock("@/lib/ingredients/repository", () => ({
  createIngredient: vi.fn(),
  listIngredients: vi.fn(),
  updateIngredient: vi.fn(),
  deleteIngredient: vi.fn(),
}));
vi.mock("@/lib/meals/repository", () => ({
  createMeal: vi.fn(),
  listMeals: vi.fn(),
  updateMeal: vi.fn(),
  deleteMeal: vi.fn(),
}));
// `next/cache` only exists in the server runtime; `@/app/(app)/meals/actions` is
// pulled in transitively by the form and the dialogs, never called here.
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireUser).mockResolvedValue(testUser);
});

/** Answers both repositories, then resolves the page element to render. */
async function renderPage(ingredients: Ingredient[], meals: Meal[]) {
  vi.mocked(listIngredients).mockResolvedValue(ingredients);
  vi.mocked(listMeals).mockResolvedValue(meals);

  render(await MealsPage());
}

/** Returns the table row whose first cell carries `mealName`. */
function rowFor(mealName: string): HTMLElement {
  const cell = screen.getByText(mealName);
  const row = cell.closest("tr");
  if (!row) throw new Error(`No table row found for "${mealName}"`);

  return row;
}

describe("MealsPage", () => {
  test("shows the heading above the library, on the design-system palette", async () => {
    await renderPage([makeIngredient()], []);

    expect(
      screen.getByRole("heading", { level: 1, name: "Meals" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The meals you build from your ingredients, ready to plan with.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveClass(
      "nutria-theme",
      "tabular-nums",
    );

    expect(screen.getByText("Meal library")).toBeInTheDocument();
    expect(screen.getByText("Your library is empty")).toBeInTheDocument();
  });

  test("builds a meal in a dialog rather than beside the library", async () => {
    const user = userEvent.setup();
    await renderPage([makeIngredient()], []);

    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add meal" }));

    const dialog = await screen.findByRole("dialog", { name: "Add meal" });
    expect(within(dialog).getByLabelText("Name")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Add meal" }),
    ).toBeInTheDocument();
  });

  test("renders the loaded meals in the library with their computed totals", async () => {
    const oats = makeIngredient({
      id: "ingredient-oats",
      name: "Rolled oats",
      caloriesPer100g: 400,
      proteinPer100g: 15,
      carbsPer100g: 60,
      fatPer100g: 10,
    });
    const berries = makeIngredient({
      id: "ingredient-berries",
      name: "Raspberries",
      caloriesPer100g: 50,
      proteinPer100g: 1,
      carbsPer100g: 12,
      fatPer100g: 0,
    });
    const porridge = makeMeal({
      id: "meal-1",
      name: "Berry porridge",
      items: [
        {
          id: "item-1",
          sortOrder: 0,
          ingredientId: oats.id,
          grams: 250,
          ingredient: oats,
        },
        {
          id: "item-2",
          sortOrder: 1,
          ingredientId: berries.id,
          grams: 100,
          ingredient: berries,
        },
      ],
    });
    const chicken = makeIngredient({ id: "ingredient-chicken" });
    const grill = makeMeal({
      id: "meal-2",
      name: "Grill plate",
      createdAt: "2026-01-02T00:00:00.000Z",
      items: [
        {
          id: "item-3",
          sortOrder: 0,
          ingredientId: chicken.id,
          grams: 200,
          ingredient: chicken,
        },
      ],
    });

    await renderPage([oats, berries, chicken], [porridge, grill]);

    expect(screen.getByText("2 meals")).toBeInTheDocument();

    const porridgeRow = rowFor("Berry porridge");
    expect(
      within(porridgeRow).getByText("Rolled oats (250 g), Raspberries (100 g)"),
    ).toBeInTheDocument();
    // 400 × 2.5 + 50 × 1 = 1050 kcal, and the macro sums next to it.
    expect(within(porridgeRow).getByText("1050")).toBeInTheDocument();
    expect(within(porridgeRow).getByText("38.5")).toBeInTheDocument();
    expect(within(porridgeRow).getByText("162")).toBeInTheDocument();
    expect(within(porridgeRow).getByText("25")).toBeInTheDocument();

    const grillRow = rowFor("Grill plate");
    expect(
      within(grillRow).getByText("Chicken breast, raw (200 g)"),
    ).toBeInTheDocument();
    // 165 × 2 = 330 kcal; fat keeps its decimal (3.6 × 2 = 7.2).
    expect(within(grillRow).getByText("330")).toBeInTheDocument();
    expect(within(grillRow).getByText("63")).toBeInTheDocument();
    expect(within(grillRow).getByText("0")).toBeInTheDocument();
    expect(within(grillRow).getByText("7.2")).toBeInTheDocument();
  });

  test("sends the user to the ingredient library when there are no ingredients", async () => {
    await renderPage([], []);

    expect(
      screen.getByRole("link", { name: "Add ingredients first" }),
    ).toHaveAttribute("href", "/ingredients");
    expect(
      screen.getByText("A meal is a set of ingredients"),
    ).toBeInTheDocument();

    // The builder itself must stay out of the way until ingredients exist.
    expect(
      screen.queryByRole("button", { name: "Add meal" }),
    ).not.toBeInTheDocument();

    // The invitation sits inside the library card.
    expect(screen.getByText("Meal library")).toBeInTheDocument();
  });

  test("loads the ingredients and the meals from the repositories once each", async () => {
    await renderPage([makeIngredient()], []);

    expect(listIngredients).toHaveBeenCalledOnce();
    expect(listMeals).toHaveBeenCalledOnce();
    expect(listIngredients).toHaveBeenCalledWith(testUser.id);
    expect(listMeals).toHaveBeenCalledWith(testUser.id);
  });

  test("reads nothing when signed out and lets the login redirect through", async () => {
    const redirectToLogin = new Error("NEXT_REDIRECT");
    vi.mocked(requireUser).mockRejectedValue(redirectToLogin);

    await expect(MealsPage()).rejects.toBe(redirectToLogin);
    expect(listIngredients).not.toHaveBeenCalled();
    expect(listMeals).not.toHaveBeenCalled();
  });
});
