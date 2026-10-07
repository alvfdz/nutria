import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import MealsPage from "@/app/meals/page";
import { listIngredients } from "@/lib/ingredients/repository";
import type { Ingredient } from "@/lib/ingredients/types";
import { listMeals } from "@/lib/meals/repository";
import type { Meal } from "@/lib/meals/types";
import { makeIngredient, makeMeal } from "@test/factories";

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
// `next/cache` only exists in the server runtime; `@/app/meals/actions` is
// pulled in transitively by the form and the dialogs, never called here.
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
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
  test("shows the heading with the meal builder beside the library", async () => {
    await renderPage([makeIngredient()], []);

    expect(
      screen.getByRole("heading", { level: 1, name: "Meals" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The meals you build from your ingredients, ready to plan with.",
      ),
    ).toBeInTheDocument();

    // Builder column: the create form with its name field and submit button.
    expect(screen.getByText("New meal")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add meal" }),
    ).toBeInTheDocument();

    // Library column: the card is there, empty until a meal is saved.
    expect(screen.getByText("Meal library")).toBeInTheDocument();
    expect(screen.getByText("Nothing saved yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your library is empty. Combine your ingredients into a meal to start planning.",
      ),
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
    expect(screen.queryByText("New meal")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add meal" }),
    ).not.toBeInTheDocument();

    // The library column still renders alongside the invitation.
    expect(screen.getByText("Meal library")).toBeInTheDocument();
  });

  test("loads the ingredients and the meals from the repositories once each", async () => {
    await renderPage([makeIngredient()], []);

    expect(listIngredients).toHaveBeenCalledOnce();
    expect(listMeals).toHaveBeenCalledOnce();
  });
});
