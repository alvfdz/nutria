import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { makeIngredient } from "@test/factories";
import { IngredientLibrary } from "@/components/ingredients/ingredient-library";
import {
  deleteIngredientAction,
  updateIngredientAction,
} from "@/app/ingredients/actions";
import { initialIngredientFormState } from "@/lib/ingredients/form-state";

vi.mock("@/app/ingredients/actions", () => ({
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
});

describe("IngredientLibrary", () => {
  test("invites the user to add something when there is nothing stored", () => {
    render(<IngredientLibrary ingredients={[]} />);

    expect(screen.getByText("Nothing saved yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your library is empty. Add an ingredient to start building meals.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

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

  test("announces a successful edit in the live region", async () => {
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

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Oats updated in your ingredient library.",
    );
  });

  test("announces a successful delete in the live region", async () => {
    const user = userEvent.setup();
    deleteAction.mockImplementation(async () => ({
      status: "success",
      deletedName: "Oats",
    }));

    render(<IngredientLibrary ingredients={[oats]} />);
    await user.click(screen.getByRole("button", { name: "Delete Oats" }));
    await user.click(await screen.findByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Oats removed from your ingredient library.",
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
    expect(name).toHaveClass("truncate");
    expect(name).toHaveAttribute("title", longName);
  });
});
