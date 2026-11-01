import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { makeIngredient } from "@test/factories";
import { updateIngredientAction } from "@/app/(app)/ingredients/actions";
import { EditIngredientDialog } from "@/components/ingredients/edit-ingredient-dialog";
import { initialIngredientFormState } from "@/lib/ingredients/form-state";

vi.mock("@/app/(app)/ingredients/actions", () => ({
  createIngredientAction: vi.fn(),
  updateIngredientAction: vi.fn(),
  deleteIngredientAction: vi.fn(),
}));

const action = vi.mocked(updateIngredientAction);

const cod = makeIngredient({
  id: "cod",
  name: "Cod",
  caloriesPer100g: 82,
  proteinPer100g: 17.8,
  carbsPer100g: 0,
  fatPer100g: 0.7,
});

const renderDialog = (
  overrides: { onClose?: () => void; onSaved?: (name: string) => void } = {},
) => {
  const onClose = overrides.onClose ?? vi.fn();
  const onSaved = overrides.onSaved ?? vi.fn();
  render(
    <EditIngredientDialog
      ingredient={cod}
      onClose={onClose}
      onSaved={onSaved}
    />,
  );
  return { onClose, onSaved };
};

beforeEach(() => {
  action.mockReset();
  action.mockImplementation(async () => initialIngredientFormState);
});

describe("EditIngredientDialog", () => {
  test("opens with the ingredient's current values", () => {
    renderDialog();

    expect(screen.getByLabelText("Name")).toHaveValue("Cod");
    expect(screen.getByLabelText("Calories (kcal)")).toHaveValue(82);
    expect(screen.getByLabelText("Protein (g)")).toHaveValue(17.8);
    expect(screen.getByLabelText("Carbs (g)")).toHaveValue(0);
    expect(screen.getByLabelText("Fat (g)")).toHaveValue(0.7);
  });

  test("carries the ingredient id in a hidden field", () => {
    renderDialog();

    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector('input[name="id"]')).toHaveValue("cod");
  });

  test("submits the edited values to the update action", async () => {
    const user = userEvent.setup();
    let submitted: FormData | undefined;
    action.mockImplementation(async (_state, formData) => {
      submitted = formData;
      return initialIngredientFormState;
    });

    renderDialog();
    await user.clear(screen.getByLabelText("Calories (kcal)"));
    await user.type(screen.getByLabelText("Calories (kcal)"), "90");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(submitted).toBeDefined());
    expect(submitted!.get("id")).toBe("cod");
    expect(submitted!.get("caloriesPer100g")).toBe("90");
  });

  test("reports the saved name and closes once the save succeeds", async () => {
    const user = userEvent.setup();
    action.mockImplementation(async () => ({
      status: "success",
      resetKey: 1,
      savedName: "Cod",
    }));

    const { onClose, onSaved } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("Cod"));
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
      formError: "The ingredient could not be saved. Please try again.",
    }));

    renderDialog();
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The ingredient could not be saved. Please try again.",
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

  test("keeps the edits when the save is rejected", async () => {
    const user = userEvent.setup();
    action.mockImplementation(async () => ({
      status: "error",
      resetKey: 0,
      fieldErrors: { name: ["Name is required"] },
    }));

    renderDialog();
    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Atlantic cod");
    await user.clear(screen.getByLabelText("Calories (kcal)"));
    await user.type(screen.getByLabelText("Calories (kcal)"), "90");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    const name = await screen.findByLabelText("Name");
    await waitFor(() => expect(name).toHaveAttribute("aria-invalid", "true"));
    expect(name).toHaveValue("Atlantic cod");
    expect(screen.getByLabelText("Calories (kcal)")).toHaveValue(90);
    expect(screen.getByLabelText("Protein (g)")).toHaveValue(17.8);
  });

  test("wraps a long name in the description so it stays inside the dialog", () => {
    const longName = "a".repeat(60);
    render(
      <EditIngredientDialog
        ingredient={makeIngredient({ id: "long", name: longName })}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByText(/Update the macros for/)).toHaveClass(
      "wrap-anywhere",
    );
  });
});
