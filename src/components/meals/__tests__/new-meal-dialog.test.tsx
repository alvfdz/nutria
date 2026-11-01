import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { makeIngredient, mealDefaults } from "@test/factories";
import { createMealAction } from "@/app/(app)/meals/actions";
import { NewMealDialog } from "@/components/meals/new-meal-dialog";
import {
  initialMealFormState,
  type MealFormState,
} from "@/lib/meals/form-state";

vi.mock("@/app/(app)/meals/actions", () => ({
  createMealAction: vi.fn(),
  updateMealAction: vi.fn(),
  deleteMealAction: vi.fn(),
}));

const action = vi.mocked(createMealAction);

const oats = makeIngredient({ id: "ing-oats", name: "Oats" });
const milk = makeIngredient({ id: "ing-milk", name: "Milk" });

/** Answers the next submit with `state`, ignoring what was submitted. */
const respondWith = (state: MealFormState) => {
  action.mockImplementation(async () => state);
};

/** Renders the dialog over both ingredients. */
const renderDialog = (
  overrides: { onClose?: () => void; onSaved?: (name: string) => void } = {},
) =>
  render(
    <NewMealDialog
      ingredients={[oats, milk]}
      onClose={overrides.onClose ?? vi.fn()}
      onSaved={overrides.onSaved ?? vi.fn()}
    />,
  );

/** Fills the name and one builder row per ingredient, in builder order. */
const fillForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText("Name"), mealDefaults.name);

  await user.click(screen.getByRole("combobox", { name: "Ingredient 1" }));
  await user.click(await screen.findByRole("option", { name: "Oats" }));
  await user.type(screen.getByLabelText("Grams 1"), "80");

  await user.click(screen.getByRole("button", { name: "Add ingredient" }));
  await user.click(screen.getByRole("combobox", { name: "Ingredient 2" }));
  await user.click(await screen.findByRole("option", { name: "Milk" }));
  await user.type(screen.getByLabelText("Grams 2"), "250");
};

beforeEach(() => {
  action.mockReset();
});

describe("NewMealDialog", () => {
  test("renders the name field, one builder row and the submit button", () => {
    renderDialog();

    expect(screen.getByRole("dialog")).toHaveClass("nutria-theme");
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Ingredient 1" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Ingredient 2")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Grams 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add meal" })).toBeEnabled();
  });

  test("hands the submitted rows to the action", async () => {
    const user = userEvent.setup();
    let submitted: FormData | undefined;

    action.mockImplementation(async (_state, formData) => {
      submitted = formData;
      return initialMealFormState;
    });

    renderDialog();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Add meal" }));

    await waitFor(() => expect(submitted).toBeDefined());
    expect(submitted!.get("name")).toBe(mealDefaults.name);
    expect(submitted!.getAll("ingredientId")).toEqual(["ing-oats", "ing-milk"]);
    expect(submitted!.getAll("grams")).toEqual(["80", "250"]);
  });

  test("shows a form error as an alert", async () => {
    const user = userEvent.setup();
    respondWith({
      status: "error",
      resetKey: 0,
      formError: "The meal could not be saved. Please try again.",
    });

    renderDialog();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Add meal" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The meal could not be saved. Please try again.",
    );
  });

  test("shows field errors on the inputs", async () => {
    const user = userEvent.setup();
    respondWith({
      status: "error",
      resetKey: 0,
      fieldErrors: { name: ["Name is required"] },
    });

    renderDialog();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Add meal" }));

    const name = screen.getByLabelText("Name");
    await waitFor(() => expect(name).toHaveAttribute("aria-invalid", "true"));
    expect(name).toHaveAccessibleDescription("Name is required");
  });

  test("keeps the entered values when validation fails", async () => {
    const user = userEvent.setup();
    respondWith({
      status: "error",
      resetKey: 0,
      fieldErrors: { name: ["Name is required"] },
    });

    renderDialog();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Add meal" }));

    const name = await screen.findByLabelText("Name");
    await waitFor(() => expect(name).toHaveAttribute("aria-invalid", "true"));
    expect(name).toHaveValue(mealDefaults.name);
    expect(screen.getByRole("combobox", { name: "Ingredient 1" })).toHaveValue(
      "Oats",
    );
    expect(screen.getByLabelText("Grams 1")).toHaveValue(80);
    expect(screen.getByRole("combobox", { name: "Ingredient 2" })).toHaveValue(
      "Milk",
    );
    expect(screen.getByLabelText("Grams 2")).toHaveValue(250);
  });

  test("reports the saved name and closes once the save succeeds", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const onClose = vi.fn();
    respondWith({ status: "success", resetKey: 1, savedName: "Porridge" });
    renderDialog({ onSaved, onClose });

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Add meal" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("Porridge"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  test("does not report a save that failed, and stays open", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    respondWith({ status: "error", resetKey: 0, formError: "Could not save" });
    renderDialog({ onSaved });

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Add meal" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save",
    );
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("cancelling closes without saving", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDialog({ onClose });

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(action).not.toHaveBeenCalled();
  });
});
