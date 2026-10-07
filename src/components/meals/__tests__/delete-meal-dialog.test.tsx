import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { makeIngredient, makeMeal } from "@test/factories";
import { deleteMealAction } from "@/app/meals/actions";
import { DeleteMealDialog } from "@/components/meals/delete-meal-dialog";
import { initialMealDeleteState } from "@/lib/meals/form-state";

vi.mock("@/app/meals/actions", () => ({
  createMealAction: vi.fn(),
  updateMealAction: vi.fn(),
  deleteMealAction: vi.fn(),
}));

const action = vi.mocked(deleteMealAction);

const porridge = makeMeal({
  id: "meal-porridge",
  name: "Porridge",
  items: [
    {
      id: "item-1",
      sortOrder: 0,
      ingredientId: "ing-oats",
      grams: 100,
      ingredient: makeIngredient({ id: "ing-oats", name: "Oats" }),
    },
  ],
});

const renderDialog = (
  overrides: { onClose?: () => void; onDeleted?: (name: string) => void } = {},
) => {
  const onClose = overrides.onClose ?? vi.fn();
  const onDeleted = overrides.onDeleted ?? vi.fn();
  render(
    <DeleteMealDialog
      meal={porridge}
      onClose={onClose}
      onDeleted={onDeleted}
    />,
  );
  return { onClose, onDeleted };
};

beforeEach(() => {
  action.mockReset();
  action.mockImplementation(async () => initialMealDeleteState);
});

describe("DeleteMealDialog", () => {
  test("warns about the meal it is about to remove", () => {
    renderDialog();

    const dialog = screen.getByRole("alertdialog");
    expect(
      within(dialog).getByText(
        /This permanently removes Porridge from your meal library\. This cannot be undone\./,
      ),
    ).toBeInTheDocument();
  });

  test("carries the id and the name in hidden fields", () => {
    renderDialog();

    const dialog = screen.getByRole("alertdialog");
    expect(dialog.querySelector('input[name="id"]')).toHaveValue(
      "meal-porridge",
    );
    expect(dialog.querySelector('input[name="name"]')).toHaveValue("Porridge");
  });

  test("deletes the meal and reports it", async () => {
    const user = userEvent.setup();
    let submitted: FormData | undefined;
    action.mockImplementation(async (_state, formData) => {
      submitted = formData;
      return initialMealDeleteState;
    });

    const { onDeleted } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(submitted!.get("id")).toBe("meal-porridge");
    expect(submitted!.get("name")).toBe("Porridge");
    expect(onDeleted).not.toHaveBeenCalled();
  });

  test("announces the deletion and closes once the action succeeds", async () => {
    const user = userEvent.setup();
    action.mockImplementation(async () => ({
      status: "success",
      deletedName: "Porridge",
    }));

    const { onClose, onDeleted } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith("Porridge"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  test("cancelling is a no-op", async () => {
    const user = userEvent.setup();
    const { onClose, onDeleted } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(action).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  test("stays open with the message when the delete fails", async () => {
    const user = userEvent.setup();
    action.mockImplementation(async () => ({
      status: "error",
      formError: "The meal could not be deleted. Please try again.",
    }));

    const { onClose, onDeleted } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The meal could not be deleted. Please try again.",
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
