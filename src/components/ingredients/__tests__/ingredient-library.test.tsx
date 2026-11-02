import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { toast } from "@/components/ui/toast";

import { makeIngredient } from "@test/factories";
import { IngredientLibrary } from "@/components/ingredients/ingredient-library";
import {
  deleteIngredientAction,
  updateIngredientAction,
} from "@/app/(app)/ingredients/actions";
import { initialIngredientFormState } from "@/lib/ingredients/form-state";

vi.mock("@/components/ui/toast", () => ({ toast: { add: vi.fn() } }));
vi.mock("@/app/(app)/ingredients/actions", () => ({
  createIngredientFromFoodfactsAction: vi.fn(),
  createIngredientAction: vi.fn(),
  updateIngredientAction: vi.fn(),
  deleteIngredientAction: vi.fn(),
}));

const updateAction = vi.mocked(updateIngredientAction);
const deleteAction = vi.mocked(deleteIngredientAction);

const chicken = makeIngredient({
  id: "chicken",
  name: "Chicken breast, raw",
  caloriesPer100g: 165,
  proteinPer100g: 31.5,
  carbsPer100g: 0,
  fatPer100g: 3.6,
});
const oats = makeIngredient({
  id: "oats",
  name: "Oats",
  caloriesPer100g: 389,
  proteinPer100g: 16.9,
  carbsPer100g: 66.3,
  fatPer100g: 6.9,
});

beforeEach(() => {
  updateAction.mockReset();
  deleteAction.mockReset();
  vi.mocked(toast.add).mockReset();
});

describe("IngredientLibrary", () => {
  test("counts the stored ingredients", () => {
    render(<IngredientLibrary ingredients={[chicken, oats]} />);

    expect(screen.getByText("2 ingredients")).toBeInTheDocument();
  });

  test("uses the singular for a single ingredient", () => {
    render(<IngredientLibrary ingredients={[chicken]} />);

    expect(screen.getByText("1 ingredient")).toBeInTheDocument();
  });

  test("renders one row per ingredient with formatted macros", () => {
    render(<IngredientLibrary ingredients={[chicken, oats]} />);

    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows).toHaveLength(3);

    const [row] = rows.slice(1);
    const cells = within(row).getAllByRole("cell");
    expect(cells.slice(0, 5).map((cell) => cell.textContent)).toEqual([
      "Chicken breast, raw",
      "165",
      "31.5",
      "0",
      "3.6",
    ]);
  });

  test("opens the edit dialog for the chosen ingredient", async () => {
    const user = userEvent.setup();
    updateAction.mockImplementation(async () => initialIngredientFormState);

    render(<IngredientLibrary ingredients={[chicken, oats]} />);
    await user.click(screen.getByRole("button", { name: "Edit Oats" }));

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("Update the macros for Oats."),
    ).toBeInTheDocument();
  });

  test("opens the delete dialog for the chosen ingredient", async () => {
    const user = userEvent.setup();
    deleteAction.mockImplementation(async () => ({ status: "idle" }));

    render(<IngredientLibrary ingredients={[chicken, oats]} />);
    await user.click(screen.getByRole("button", { name: "Delete Oats" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent(
      "This permanently removes Oats from your library.",
    );
  });

  test("does not open the delete dialog when the edit one is opened", async () => {
    const user = userEvent.setup();
    updateAction.mockImplementation(async () => initialIngredientFormState);

    render(<IngredientLibrary ingredients={[chicken, oats]} />);
    await user.click(screen.getByRole("button", { name: "Edit Oats" }));

    await screen.findByRole("dialog");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  test("confirms a successful edit with a toast", async () => {
    const user = userEvent.setup();
    updateAction.mockImplementation(async () => ({
      status: "success",
      resetKey: 1,
      savedName: "Oats",
    }));

    render(<IngredientLibrary ingredients={[oats]} />);
    await user.click(screen.getByRole("button", { name: "Edit Oats" }));
    const save = await screen.findByRole("button", { name: "Save changes" });
    await user.click(save);

    await waitFor(() =>
      expect(toast.add).toHaveBeenCalledWith({
        type: "success",
        title: "Oats updated.",
      }),
    );
  });

  test("confirms a successful delete with a toast", async () => {
    const user = userEvent.setup();
    deleteAction.mockImplementation(async () => ({
      status: "success",
      deletedName: "Oats",
    }));

    render(<IngredientLibrary ingredients={[oats]} />);
    await user.click(screen.getByRole("button", { name: "Delete Oats" }));
    await user.click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(toast.add).toHaveBeenCalledWith({
        type: "success",
        title: "Oats deleted.",
      }),
    );
  });

  test("clips a long ingredient name instead of stretching the table", () => {
    const longName = "a".repeat(60);
    render(
      <IngredientLibrary
        ingredients={[makeIngredient({ id: "long", name: longName })]}
      />,
    );

    const name = screen.getByText(longName);
    expect(name).toHaveClass("line-clamp-2", "wrap-anywhere");
    expect(name).toHaveAttribute("title", longName);
    expect(name.parentElement).toHaveClass("min-w-0");
    expect(name.closest("table")).toHaveClass("table-fixed");
  });

  test("heads the macro columns in protein, carbs, fat order", () => {
    render(<IngredientLibrary ingredients={[oats]} />);

    const names = screen
      .getAllByRole("columnheader")
      .map((header) => header.textContent);

    expect(names).toEqual([
      "Ingredient",
      "kcal",
      "PProtein",
      "CCarbs",
      "FFat",
      "Actions",
    ]);
  });

  test("folds the row actions into a menu that opens the edit dialog", async () => {
    const user = userEvent.setup();
    render(<IngredientLibrary ingredients={[oats]} />);

    await user.click(screen.getByRole("button", { name: "Actions for Oats" }));
    await user.click(await screen.findByRole("menuitem", { name: "Edit" }));

    expect(
      await screen.findByRole("dialog", { name: "Edit ingredient" }),
    ).toBeInTheDocument();
  });

  test("folds the row actions into a menu that opens the delete dialog", async () => {
    const user = userEvent.setup();
    render(<IngredientLibrary ingredients={[oats]} />);

    await user.click(screen.getByRole("button", { name: "Actions for Oats" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));

    expect(
      await screen.findByRole("alertdialog", { name: "Delete ingredient" }),
    ).toBeInTheDocument();
  });

  describe("when the library is empty", () => {
    test("offers a search and a manual add instead of a table", () => {
      render(<IngredientLibrary ingredients={[]} />);

      expect(screen.getByText("Your library is empty")).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: "Search OpenFoodFacts" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Add manually" }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("textbox", { name: "Filter ingredients" }),
      ).not.toBeInTheDocument();
    });

    test("carries the search into the import dialog", async () => {
      const user = userEvent.setup();
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({ ok: true, json: async () => ({ results: [] }) })),
      );
      render(<IngredientLibrary ingredients={[]} />);

      await user.type(
        screen.getByRole("textbox", { name: "Search OpenFoodFacts" }),
        "almond",
      );
      await user.click(screen.getByRole("button", { name: "Search" }));

      const dialog = await screen.findByRole("dialog", {
        name: "Import from OpenFoodFacts",
      });
      expect(within(dialog).getByRole("textbox")).toHaveValue("almond");
      await waitFor(() =>
        expect(vi.mocked(fetch).mock.calls[0][0]).toContain("q=almond"),
      );
      vi.unstubAllGlobals();
    });

    test("keeps the import dialog open when the first import fills the library", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<IngredientLibrary ingredients={[]} />);

      await user.click(screen.getByRole("button", { name: "Search" }));
      await screen.findByRole("dialog");
      rerender(<IngredientLibrary ingredients={[oats]} />);

      expect(
        screen.getByRole("dialog", { name: "Import from OpenFoodFacts" }),
      ).toBeInTheDocument();
    });
  });

  test("makes importing the primary way in, and adding by hand secondary", () => {
    render(<IngredientLibrary ingredients={[oats]} />);

    expect(
      screen.getByRole("button", { name: "Import from OpenFoodFacts" }),
    ).toHaveClass("bg-primary");
    expect(screen.getByRole("button", { name: "Add manually" })).toHaveClass(
      "border-border",
    );
  });

  test("adds by hand in a dialog", async () => {
    const user = userEvent.setup();
    render(<IngredientLibrary ingredients={[oats]} />);

    await user.click(screen.getByRole("button", { name: "Add manually" }));

    expect(
      await screen.findByRole("dialog", { name: "New ingredient" }),
    ).toBeInTheDocument();
  });

  describe("filtering", () => {
    test("narrows the table and the count as the user types", async () => {
      const user = userEvent.setup();
      render(<IngredientLibrary ingredients={[chicken, oats]} />);

      await user.type(
        screen.getByRole("textbox", { name: "Filter ingredients" }),
        "oat",
      );

      expect(screen.getByText("Oats")).toBeInTheDocument();
      expect(screen.queryByText(chicken.name)).not.toBeInTheDocument();
      expect(screen.getByText("1 of 2 ingredients")).toBeInTheDocument();
    });

    test("says when nothing matches and clears the filter", async () => {
      const user = userEvent.setup();
      render(<IngredientLibrary ingredients={[chicken, oats]} />);

      await user.type(
        screen.getByRole("textbox", { name: "Filter ingredients" }),
        "tofu",
      );

      expect(screen.getByText("Nothing matches “tofu”")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Clear filter" }));

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getByText("2 ingredients")).toBeInTheDocument();
    });

    test("takes an unmatched filter to the import dialog", async () => {
      const user = userEvent.setup();
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({ ok: true, json: async () => ({ results: [] }) })),
      );
      render(<IngredientLibrary ingredients={[oats]} />);

      await user.type(
        screen.getByRole("textbox", { name: "Filter ingredients" }),
        "tofu",
      );
      await user.click(
        screen.getByRole("button", { name: "Search OpenFoodFacts" }),
      );

      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByRole("textbox")).toHaveValue("tofu");
      vi.unstubAllGlobals();
    });
  });

  describe("sorting", () => {
    const rowNames = () =>
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getAllByRole("cell")[0].textContent);

    test("starts newest first, as given, with no column marked", () => {
      render(<IngredientLibrary ingredients={[oats, chicken]} />);

      expect(rowNames()).toEqual([oats.name, chicken.name]);
      for (const header of screen.getAllByRole("columnheader")) {
        expect(header).not.toHaveAttribute("aria-sort");
      }
    });

    test("cycles a macro column highest first, lowest first, then newest", async () => {
      const user = userEvent.setup();
      render(<IngredientLibrary ingredients={[oats, chicken]} />);
      const button = screen.getByRole("button", { name: "Protein" });
      const header = screen.getByRole("columnheader", { name: "Protein" });
      const [low, high] =
        oats.proteinPer100g < chicken.proteinPer100g
          ? [oats, chicken]
          : [chicken, oats];

      await user.click(button);
      expect(header).toHaveAttribute("aria-sort", "descending");
      expect(rowNames()).toEqual([high.name, low.name]);

      await user.click(button);
      expect(header).toHaveAttribute("aria-sort", "ascending");
      expect(rowNames()).toEqual([low.name, high.name]);

      await user.click(button);
      expect(header).not.toHaveAttribute("aria-sort");
      expect(rowNames()).toEqual([oats.name, chicken.name]);
    });

    test("sorts names A to Z first", async () => {
      const user = userEvent.setup();
      render(<IngredientLibrary ingredients={[oats, chicken]} />);

      await user.click(screen.getByRole("button", { name: "Ingredient" }));

      expect(rowNames()).toEqual([chicken.name, oats.name]);
    });
  });

  describe("macro bars", () => {
    test("shows each macro's share of the calories", () => {
      render(
        <IngredientLibrary
          ingredients={[
            makeIngredient({
              id: "half",
              name: "Half",
              proteinPer100g: 9,
              carbsPer100g: 0,
              fatPer100g: 4,
            }),
          ]}
        />,
      );

      const segments = document.querySelectorAll<HTMLElement>(
        '[data-slot="macro-bar-segment"]',
      );
      expect([...segments].map((segment) => segment.style.width)).toEqual([
        "50%",
        "0%",
        "50%",
      ]);
    });

    test("leaves the bar out when there are no macros", () => {
      render(
        <IngredientLibrary
          ingredients={[
            makeIngredient({
              id: "water",
              name: "Water",
              proteinPer100g: 0,
              carbsPer100g: 0,
              fatPer100g: 0,
            }),
          ]}
        />,
      );

      expect(
        document.querySelector('[data-slot="macro-bar"]'),
      ).not.toBeInTheDocument();
    });
  });

  test("names the meals in the way of a delete", async () => {
    const user = userEvent.setup();
    render(
      <IngredientLibrary
        ingredients={[oats]}
        usage={{ [oats.id]: ["Granola"] }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete Oats" }));

    expect(
      await screen.findByRole("alertdialog", { name: "Ingredient in use" }),
    ).toHaveTextContent("Oats is used in Granola.");
  });

  test("highlights a saved row once the dialog has closed", async () => {
    const user = userEvent.setup();
    updateAction.mockImplementation(async () => ({
      status: "success",
      resetKey: 1,
      savedName: "Oats",
    }));
    render(<IngredientLibrary ingredients={[oats]} />);

    await user.click(screen.getByRole("button", { name: "Edit Oats" }));
    await user.click(
      await screen.findByRole("button", { name: "Save changes" }),
    );

    await waitFor(() =>
      expect(screen.getByText("Oats").closest("tr")).toHaveAttribute(
        "data-new",
        "true",
      ),
    );
  });
});
