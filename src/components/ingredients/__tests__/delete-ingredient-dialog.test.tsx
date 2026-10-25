import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { makeIngredient } from "@test/factories";
import { deleteIngredientAction } from "@/app/(app)/ingredients/actions";
import { DeleteIngredientDialog } from "@/components/ingredients/delete-ingredient-dialog";
import { initialIngredientDeleteState } from "@/lib/ingredients/form-state";

vi.mock("@/app/(app)/ingredients/actions", () => ({
  createIngredientAction: vi.fn(),
  updateIngredientAction: vi.fn(),
  deleteIngredientAction: vi.fn(),
}));

const action = vi.mocked(deleteIngredientAction);

const oats = makeIngredient({ id: "oats", name: "Oats" });

const renderDialog = (
  overrides: { onClose?: () => void; onDeleted?: (name: string) => void } = {},
) => {
  const onClose = overrides.onClose ?? vi.fn();
  const onDeleted = overrides.onDeleted ?? vi.fn();
  render(
    <DeleteIngredientDialog
      ingredient={oats}
      onClose={onClose}
      onDeleted={onDeleted}
    />,
  );
  return { onClose, onDeleted };
};

beforeEach(() => {
  action.mockReset();
  action.mockImplementation(async () => initialIngredientDeleteState);
});

describe("DeleteIngredientDialog", () => {
  test("warns about the ingredient it is about to remove", () => {
    renderDialog();

    const dialog = screen.getByRole("alertdialog");
    expect(
      within(dialog).getByText(
        /This permanently removes Oats from your library\. This cannot be undone\./,
      ),
    ).toBeInTheDocument();
  });

  test("carries the id and the name in hidden fields", () => {
    renderDialog();

    const dialog = screen.getByRole("alertdialog");
    expect(dialog.querySelector('input[name="id"]')).toHaveValue("oats");
    expect(dialog.querySelector('input[name="name"]')).toHaveValue("Oats");
  });

  test("deletes the ingredient and reports it", async () => {
    const user = userEvent.setup();
    let submitted: FormData | undefined;
    action.mockImplementation(async (_state, formData) => {
      submitted = formData;
      return initialIngredientDeleteState;
    });

    const { onDeleted } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(submitted!.get("id")).toBe("oats");
    expect(submitted!.get("name")).toBe("Oats");
    expect(onDeleted).not.toHaveBeenCalled();
  });

  test("announces the deletion and closes once the action succeeds", async () => {
    const user = userEvent.setup();
    action.mockImplementation(async () => ({
      status: "success",
      deletedName: "Oats",
    }));

    const { onClose, onDeleted } = renderDialog();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith("Oats"));
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

  test("shows a form error as an alert", async () => {
    const user = userEvent.setup();
    action.mockImplementation(async () => ({
      status: "error",
      formError: "The ingredient could not be deleted. Please try again.",
    }));

    renderDialog();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The ingredient could not be deleted. Please try again.",
    );
  });

  test("wraps a long name in the description so it stays inside the dialog", () => {
    const longName = "a".repeat(60);
    render(
      <DeleteIngredientDialog
        ingredient={makeIngredient({ id: "long", name: longName })}
        onClose={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );

    expect(screen.getByText(/This permanently removes/)).toHaveClass(
      "wrap-anywhere",
    );
  });
});
