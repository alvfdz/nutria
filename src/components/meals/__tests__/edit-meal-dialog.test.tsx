import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { makeIngredient, makeMeal } from "@test/factories";
import { updateMealAction } from "@/app/meals/actions";
import { EditMealDialog } from "@/components/meals/edit-meal-dialog";
import { initialMealFormState } from "@/lib/meals/form-state";

vi.mock("@/app/meals/actions", () => ({
  createMealAction: vi.fn(),
  updateMealAction: vi.fn(),
  deleteMealAction: vi.fn(),
}));

const action = vi.mocked(updateMealAction);

const oats = makeIngredient({ id: "ing-oats", name: "Oats" });
const milk = makeIngredient({ id: "ing-milk", name: "Milk" });

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

const renderDialog = (
  overrides: { onClose?: () => void; onSaved?: (name: string) => void } = {},
) => {
  const onClose = overrides.onClose ?? vi.fn();
  const onSaved = overrides.onSaved ?? vi.fn();
  render(
    <EditMealDialog
      meal={porridge}
      ingredients={[oats, milk]}
      onClose={onClose}
      onSaved={onSaved}
    />,
  );
  return { onClose, onSaved };
};

beforeEach(() => {
  action.mockReset();
  action.mockImplementation(async () => initialMealFormState);
});

describe("EditMealDialog", () => {
  test("opens with the meal's current values", () => {
    renderDialog();

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Name")).toHaveValue("Porridge");
    expect(
      within(dialog).getByRole("combobox", { name: "Ingredient 1" }),
    ).toHaveTextContent("Oats");
    expect(within(dialog).getByLabelText("Grams 1")).toHaveValue(100);
    expect(
      within(dialog).getByRole("combobox", { name: "Ingredient 2" }),
    ).toHaveTextContent("Milk");
    expect(within(dialog).getByLabelText("Grams 2")).toHaveValue(200);
    expect(
      within(dialog).getByText("Update the ingredients that make up Porridge."),
    ).toBeInTheDocument();
  });

  test("carries the meal id in a hidden field", () => {
    renderDialog();

    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector('input[name="id"]')).toHaveValue(
      "meal-porridge",
    );
  });

  test("submits the edited rows to the update action", async () => {
    const user = userEvent.setup();
    let submitted: FormData | undefined;
    action.mockImplementation(async (_state, formData) => {
      submitted = formData;
      return initialMealFormState;
    });

    renderDialog();
    await user.clear(screen.getByLabelText("Grams 1"));
    await user.type(screen.getByLabelText("Grams 1"), "150");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(submitted).toBeDefined());
    expect(submitted!.get("id")).toBe("meal-porridge");
    expect(submitted!.get("name")).toBe("Porridge");
    expect(submitted!.getAll("ingredientId")).toEqual(["ing-oats", "ing-milk"]);
    expect(submitted!.getAll("grams")).toEqual(["150", "200"]);
  });

  test("reports the saved name and closes once the save succeeds", async () => {
    const user = userEvent.setup();
    action.mockImplementation(async () => ({
      status: "success",
      resetKey: 1,
      savedName: "Porridge",
    }));

    const { onClose, onSaved } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("Porridge"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  test("cancelling closes without saving", async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(action).not.toHaveBeenCalled();
  });

  test("shows a form error as an alert", async () => {
    const user = userEvent.setup();
    action.mockImplementation(async () => ({
      status: "error",
      resetKey: 0,
      formError: "The meal could not be saved. Please try again.",
    }));

    renderDialog();
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The meal could not be saved. Please try again.",
    );
  });

  test("marks the fields the action rejected", async () => {
    const user = userEvent.setup();
    action.mockImplementation(async () => ({
      status: "error",
      resetKey: 0,
      fieldErrors: { name: ["Name is required"] },
    }));

    renderDialog();
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    const name = await screen.findByLabelText("Name");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription("Name is required");
  });
});
