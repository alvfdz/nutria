import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { makeIngredient, makeMeal } from "@test/factories";
import { deleteMealAction, updateMealAction } from "@/app/(app)/meals/actions";
import { MealLibrary } from "@/components/meals/meal-library";
import {
  initialMealDeleteState,
  initialMealFormState,
} from "@/lib/meals/form-state";

vi.mock("@/app/(app)/meals/actions", () => ({
  createMealAction: vi.fn(),
  updateMealAction: vi.fn(),
  deleteMealAction: vi.fn(),
}));

const updateAction = vi.mocked(updateMealAction);
const deleteAction = vi.mocked(deleteMealAction);

// Round per-100 g densities at round quantities, so `computeMealTotals`
// yields exact integers the display can render without rounding.
const oats = makeIngredient({
  id: "ing-oats",
  name: "Oats",
  caloriesPer100g: 400,
  proteinPer100g: 20,
  carbsPer100g: 60,
  fatPer100g: 10,
});
const milk = makeIngredient({
  id: "ing-milk",
  name: "Milk",
  caloriesPer100g: 50,
  proteinPer100g: 5,
  carbsPer100g: 5,
  fatPer100g: 2,
});

// 400×1 + 50×2 = 500 kcal, 30 g protein, 70 g carbs, 14 g fat.
const porridge = makeMeal({
  id: "meal-porridge",
  name: "Porridge",
  items: [
    {
      id: "item-1",
      sortOrder: 0,
      ingredientId: "ing-oats",
      grams: 100,
      ingredient: oats,
    },
    {
      id: "item-2",
      sortOrder: 1,
      ingredientId: "ing-milk",
      grams: 200,
      ingredient: milk,
    },
  ],
});

const soup = makeMeal({
  id: "meal-soup",
  name: "Soup",
  items: [
    {
      id: "item-3",
      sortOrder: 0,
      ingredientId: "ing-milk",
      grams: 100,
      ingredient: milk,
    },
  ],
});

beforeEach(() => {
  updateAction.mockReset();
  deleteAction.mockReset();
});

describe("MealLibrary", () => {
  test("invites the user to save something when there is nothing stored", () => {
    render(<MealLibrary meals={[]} ingredients={[oats, milk]} />);

    expect(screen.getByText("Nothing saved yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your library is empty. Combine your ingredients into a meal to start planning.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  test("counts the stored meals", () => {
    render(<MealLibrary meals={[porridge, soup]} ingredients={[oats, milk]} />);

    expect(screen.getByText("2 meals")).toBeInTheDocument();
  });

  test("uses the singular for a single meal", () => {
    render(<MealLibrary meals={[porridge]} ingredients={[oats, milk]} />);

    expect(screen.getByText("1 meal")).toBeInTheDocument();
  });

  test("renders one row per meal with its ingredients and computed totals", () => {
    render(<MealLibrary meals={[porridge]} ingredients={[oats, milk]} />);

    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows).toHaveLength(2);

    const cells = within(rows[1]).getAllByRole("cell");
    expect(cells).toHaveLength(6);

    const [mealCell, ...rest] = cells;
    expect(within(mealCell).getByText("Porridge")).toBeInTheDocument();
    expect(
      within(mealCell).getByText("Oats (100 g), Milk (200 g)"),
    ).toBeInTheDocument();
    // The four macro columns follow, with Actions last.
    expect(rest.slice(0, 4).map((cell) => cell.textContent)).toEqual([
      "500",
      "30",
      "70",
      "14",
    ]);
  });

  test("offers an edit and a delete button per row", () => {
    render(<MealLibrary meals={[porridge, soup]} ingredients={[oats, milk]} />);

    expect(
      screen.getByRole("button", { name: "Edit Porridge" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete Porridge" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit Soup" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete Soup" }),
    ).toBeInTheDocument();
  });

  test("opens the edit dialog for the chosen meal", async () => {
    const user = userEvent.setup();
    updateAction.mockImplementation(async () => initialMealFormState);

    render(<MealLibrary meals={[porridge, soup]} ingredients={[oats, milk]} />);
    await user.click(screen.getByRole("button", { name: "Edit Soup" }));

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("Update the ingredients that make up Soup."),
    ).toBeInTheDocument();
  });

  test("opens the delete dialog for the chosen meal", async () => {
    const user = userEvent.setup();
    deleteAction.mockImplementation(async () => initialMealDeleteState);

    render(<MealLibrary meals={[porridge, soup]} ingredients={[oats, milk]} />);
    await user.click(screen.getByRole("button", { name: "Delete Soup" }));

    const alertdialog = await screen.findByRole("alertdialog");
    expect(alertdialog).toHaveTextContent(
      "This permanently removes Soup from your meal library.",
    );
  });

  test("does not open the delete dialog when the edit one is opened", async () => {
    const user = userEvent.setup();
    updateAction.mockImplementation(async () => initialMealFormState);

    render(<MealLibrary meals={[porridge]} ingredients={[oats, milk]} />);
    await user.click(screen.getByRole("button", { name: "Edit Porridge" }));

    await screen.findByRole("dialog");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  test("announces a successful edit in the live region", async () => {
    const user = userEvent.setup();
    updateAction.mockImplementation(async () => ({
      status: "success",
      resetKey: 1,
      savedName: "Porridge",
    }));

    render(<MealLibrary meals={[porridge]} ingredients={[oats, milk]} />);
    await user.click(screen.getByRole("button", { name: "Edit Porridge" }));
    const save = await screen.findByRole("button", { name: "Save changes" });
    await user.click(save);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Porridge updated in your meal library.",
    );
  });

  test("announces a successful delete in the live region", async () => {
    const user = userEvent.setup();
    deleteAction.mockImplementation(async () => ({
      status: "success",
      deletedName: "Porridge",
    }));

    render(<MealLibrary meals={[porridge]} ingredients={[oats, milk]} />);
    await user.click(screen.getByRole("button", { name: "Delete Porridge" }));
    await user.click(await screen.findByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Porridge removed from your meal library.",
    );
  });

  test("keeps the dialog open with the error while the live region stays silent", async () => {
    const user = userEvent.setup();
    deleteAction.mockImplementation(async () => ({
      status: "error",
      formError: "The meal could not be deleted. Please try again.",
    }));

    render(<MealLibrary meals={[porridge]} ingredients={[oats, milk]} />);
    await user.click(screen.getByRole("button", { name: "Delete Porridge" }));
    await user.click(await screen.findByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The meal could not be deleted. Please try again.",
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("status", { hidden: true })).toBeEmptyDOMElement();
  });

  test("clips a long meal name and its ingredient list", () => {
    const longName = "a".repeat(60);
    const longMeal = makeMeal({
      id: "meal-long",
      name: longName,
      items: [
        {
          id: "item-long",
          sortOrder: 0,
          ingredientId: "ing-oats",
          grams: 100,
          ingredient: oats,
        },
      ],
    });

    render(<MealLibrary meals={[longMeal]} ingredients={[oats, milk]} />);

    const name = screen.getByText(longName);
    expect(name).toHaveClass("truncate");
    expect(name).toHaveAttribute("title", longName);

    const items = screen.getByText("Oats (100 g)");
    expect(items).toHaveClass("truncate");
    expect(items).toHaveAttribute("title", "Oats (100 g)");
  });
});
