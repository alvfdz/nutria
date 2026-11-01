import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { toast } from "sonner";

import { makeIngredient, makeMeal } from "@test/factories";
import {
  createMealAction,
  deleteMealAction,
  updateMealAction,
} from "@/app/(app)/meals/actions";
import { MealLibrary } from "@/components/meals/meal-library";
import { THIN_SPACE } from "@/lib/design-system";
import {
  initialMealDeleteState,
  initialMealFormState,
} from "@/lib/meals/form-state";

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
vi.mock("@/app/(app)/meals/actions", () => ({
  createMealAction: vi.fn(),
  updateMealAction: vi.fn(),
  deleteMealAction: vi.fn(),
}));

const createAction = vi.mocked(createMealAction);
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
  createAction.mockReset();
  updateAction.mockReset();
  deleteAction.mockReset();
  vi.mocked(toast.success).mockReset();
});

/** The meal names of the table's rows, top to bottom. */
const rowNames = () =>
  within(screen.getByRole("table"))
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0].firstElementChild)
    .map((cell) => cell?.querySelector("[title]")?.getAttribute("title"));

describe("MealLibrary", () => {
  test("starts an empty library with the action that adds a meal", async () => {
    const user = userEvent.setup();
    render(<MealLibrary meals={[]} ingredients={[oats, milk]} />);

    expect(screen.getByText("Your library is empty")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Filter meals")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add meal" }));

    expect(
      await screen.findByRole("dialog", { name: "Add meal" }),
    ).toBeInTheDocument();
  });

  test("leads to the ingredient library when there is nothing to build from", () => {
    render(<MealLibrary meals={[]} ingredients={[]} />);

    expect(
      screen.getByText("A meal is a set of ingredients"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Add ingredients first" }),
    ).toHaveAttribute("href", "/ingredients");
    expect(
      screen.queryByRole("button", { name: "Add meal" }),
    ).not.toBeInTheDocument();
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

  test("confirms a successful edit with a toast", async () => {
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

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Porridge updated."),
    );
  });

  test("confirms a successful delete with a toast", async () => {
    const user = userEvent.setup();
    deleteAction.mockImplementation(async () => ({
      status: "success",
      deletedName: "Porridge",
    }));

    render(<MealLibrary meals={[porridge]} ingredients={[oats, milk]} />);
    await user.click(screen.getByRole("button", { name: "Delete Porridge" }));
    await user.click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Porridge deleted."),
    );
  });

  test("keeps the dialog open with the error, and confirms nothing", async () => {
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
    expect(toast.success).not.toHaveBeenCalled();
  });

  test("highlights a saved row once the dialog has closed", async () => {
    const user = userEvent.setup();
    updateAction.mockImplementation(async () => ({
      status: "success",
      resetKey: 1,
      savedName: "Porridge",
    }));

    render(<MealLibrary meals={[porridge]} ingredients={[oats, milk]} />);
    await user.click(screen.getByRole("button", { name: "Edit Porridge" }));
    await user.click(
      await screen.findByRole("button", { name: "Save changes" }),
    );

    await waitFor(() =>
      expect(screen.getByText("Porridge").closest("tr")).toHaveAttribute(
        "data-new",
        "true",
      ),
    );
  });

  test("heads the macro columns in protein, carbs, fat order", () => {
    render(<MealLibrary meals={[porridge]} ingredients={[oats, milk]} />);

    expect(
      screen.getAllByRole("columnheader").map((head) => head.textContent),
    ).toEqual(["Meal", "kcal", "PProtein", "CCarbs", "FFat", "Actions"]);
  });

  test("shows each macro's share of the calories", () => {
    render(<MealLibrary meals={[soup]} ingredients={[oats, milk]} />);

    // Soup is 100 g of milk: 20, 20 and 18 kcal from its macros.
    const widths = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-slot="macro-bar-segment"]',
      ),
    ].map((segment) => parseFloat(segment.style.width));
    expect(widths[0]).toBeCloseTo((20 / 58) * 100);
    expect(widths[1]).toBeCloseTo((20 / 58) * 100);
    expect(widths[2]).toBeCloseTo((18 / 58) * 100);
  });

  test("leaves the bar out of a meal with no macros", () => {
    const water = makeIngredient({
      id: "ing-water",
      name: "Water",
      caloriesPer100g: 0,
      proteinPer100g: 0,
      carbsPer100g: 0,
      fatPer100g: 0,
    });
    const glass = makeMeal({
      id: "meal-glass",
      name: "Glass of water",
      items: [
        {
          id: "item-water",
          sortOrder: 0,
          ingredientId: water.id,
          grams: 250,
          ingredient: water,
        },
      ],
    });

    render(<MealLibrary meals={[glass]} ingredients={[water]} />);

    expect(
      document.querySelector('[data-slot="macro-bar"]'),
    ).not.toBeInTheDocument();
  });

  test("clears the filter when a save would be hidden by it", async () => {
    const user = userEvent.setup();
    createAction.mockImplementation(async () => ({
      status: "success",
      resetKey: 1,
      savedName: "Toast",
    }));
    render(<MealLibrary meals={[porridge, soup]} ingredients={[oats, milk]} />);

    await user.type(screen.getByLabelText("Filter meals"), "porr");
    await user.click(screen.getByRole("button", { name: "Add meal" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Add meal" }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Toast added."),
    );
    expect(screen.getByLabelText("Filter meals")).toHaveValue("");
  });

  test("keeps the filter through an edit", async () => {
    const user = userEvent.setup();
    updateAction.mockImplementation(async () => ({
      status: "success",
      resetKey: 1,
      savedName: "Porridge",
    }));
    render(<MealLibrary meals={[porridge, soup]} ingredients={[oats, milk]} />);

    await user.type(screen.getByLabelText("Filter meals"), "porr");
    await user.click(screen.getByRole("button", { name: "Edit Porridge" }));
    await user.click(
      await screen.findByRole("button", { name: "Save changes" }),
    );

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Porridge updated."),
    );
    expect(screen.getByLabelText("Filter meals")).toHaveValue("porr");
  });

  test("states its table roles, which its phone layout would otherwise drop", () => {
    render(<MealLibrary meals={[porridge]} ingredients={[oats, milk]} />);

    const table = screen.getByRole("table");
    expect(table).toHaveAttribute("role", "table");
    for (const row of within(table).getAllByRole("row")) {
      expect(row).toHaveAttribute("role", "row");
    }
    for (const head of within(table).getAllByRole("columnheader")) {
      expect(head).toHaveAttribute("role", "columnheader");
    }
    for (const cell of within(table).getAllByRole("cell")) {
      expect(cell).toHaveAttribute("role", "cell");
    }
    for (const group of within(table).getAllByRole("rowgroup")) {
      expect(group).toHaveAttribute("role", "rowgroup");
    }
  });

  describe("filtering", () => {
    test("narrows the rows and the count", async () => {
      const user = userEvent.setup();
      render(
        <MealLibrary meals={[porridge, soup]} ingredients={[oats, milk]} />,
      );

      await user.type(screen.getByLabelText("Filter meals"), "porr");

      expect(rowNames()).toEqual(["Porridge"]);
      expect(screen.getByText("1 of 2 meals")).toBeInTheDocument();
    });

    test("finds a meal by an ingredient it lists", async () => {
      const user = userEvent.setup();
      render(
        <MealLibrary meals={[porridge, soup]} ingredients={[oats, milk]} />,
      );

      await user.type(screen.getByLabelText("Filter meals"), "oats");

      expect(rowNames()).toEqual(["Porridge"]);
    });

    test("offers to clear a filter that matches nothing", async () => {
      const user = userEvent.setup();
      render(
        <MealLibrary meals={[porridge, soup]} ingredients={[oats, milk]} />,
      );

      await user.type(screen.getByLabelText("Filter meals"), "tofu");

      expect(screen.getByText("Nothing matches “tofu”")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Clear filter" }));

      expect(rowNames()).toEqual(["Porridge", "Soup"]);
    });
  });

  describe("sorting", () => {
    test("keeps the given order until a heading is clicked", () => {
      render(
        <MealLibrary meals={[soup, porridge]} ingredients={[oats, milk]} />,
      );

      expect(rowNames()).toEqual(["Soup", "Porridge"]);
    });

    test("sorts by a computed total, highest first", async () => {
      const user = userEvent.setup();
      render(
        <MealLibrary meals={[soup, porridge]} ingredients={[oats, milk]} />,
      );

      await user.click(screen.getByRole("button", { name: "kcal" }));

      expect(rowNames()).toEqual(["Porridge", "Soup"]);
      expect(
        screen.getByRole("columnheader", { name: "kcal" }),
      ).toHaveAttribute("aria-sort", "descending");
    });

    test("sorts by a macro column", async () => {
      const user = userEvent.setup();
      render(
        <MealLibrary meals={[soup, porridge]} ingredients={[oats, milk]} />,
      );

      await user.click(screen.getByRole("button", { name: "Protein" }));

      expect(rowNames()).toEqual(["Porridge", "Soup"]);
    });

    test("goes back to newest first on the third click", async () => {
      const user = userEvent.setup();
      render(
        <MealLibrary meals={[soup, porridge]} ingredients={[oats, milk]} />,
      );

      const heading = screen.getByRole("button", { name: "Meal" });
      await user.click(heading);
      expect(rowNames()).toEqual(["Porridge", "Soup"]);

      await user.click(heading);
      expect(rowNames()).toEqual(["Soup", "Porridge"]);

      await user.click(heading);
      expect(rowNames()).toEqual(["Soup", "Porridge"]);
      expect(
        screen.getByRole("columnheader", { name: "Meal" }),
      ).not.toHaveAttribute("aria-sort");
    });
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
    expect(name).toHaveClass("line-clamp-2", "wrap-anywhere");
    expect(name).toHaveAttribute("title", longName);
    expect(name.parentElement).toHaveClass("min-w-0");
    expect(name.parentElement?.parentElement).toHaveClass("min-w-0");
    expect(name.closest("table")).toHaveClass("table-fixed");

    const items = screen.getByText("Oats (100 g)");
    expect(items).toHaveClass("line-clamp-2", "sm:line-clamp-1");
    expect(items).toHaveAttribute("title", `Oats (100${THIN_SPACE}g)`);
  });
});
