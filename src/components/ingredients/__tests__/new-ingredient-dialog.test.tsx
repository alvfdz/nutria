import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { waitForDialogFocus } from "@test/dialog";
import { createIngredientAction } from "@/app/(app)/ingredients/actions";
import { NewIngredientDialog } from "@/components/ingredients/new-ingredient-dialog";
import {
  initialIngredientFormState,
  type IngredientFormState,
} from "@/lib/ingredients/form-state";

vi.mock("@/app/(app)/ingredients/actions", () => ({
  createIngredientAction: vi.fn(),
}));

const action = vi.mocked(createIngredientAction);

/** Answers the next submit with `state`, ignoring what was submitted. */
const respondWith = (state: IngredientFormState) => {
  action.mockImplementation(async () => state);
};

const fillForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await waitForDialogFocus();
  await user.type(screen.getByLabelText("Name"), "Cod");
  await user.type(screen.getByLabelText("Calories (kcal)"), "82");
  await user.type(screen.getByLabelText("Protein (g)"), "17.8");
  await user.type(screen.getByLabelText("Carbs (g)"), "0");
  await user.type(screen.getByLabelText("Fat (g)"), "0.7");
};

beforeEach(() => {
  action.mockReset();
});

describe("NewIngredientDialog", () => {
  test("renders the ingredient fields and the submit button", () => {
    respondWith(initialIngredientFormState);
    render(<NewIngredientDialog onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Calories (kcal)")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add ingredient" }),
    ).toBeEnabled();
  });

  test("hands the submitted values to the action", async () => {
    const user = userEvent.setup();
    let submitted: FormData | undefined;

    action.mockImplementation(async (_state, formData) => {
      submitted = formData;
      return initialIngredientFormState;
    });

    render(<NewIngredientDialog onClose={vi.fn()} onSaved={vi.fn()} />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Add ingredient" }));

    await waitFor(() => expect(submitted).toBeDefined());
    expect(Object.fromEntries(submitted!)).toEqual({
      name: "Cod",
      caloriesPer100g: "82",
      proteinPer100g: "17.8",
      carbsPer100g: "0",
      fatPer100g: "0.7",
    });
  });

  test("submits empty fields so the action can report them", async () => {
    const user = userEvent.setup();
    respondWith({
      status: "error",
      resetKey: 0,
      fieldErrors: {
        name: ["Name is required"],
        caloriesPer100g: ["Calories is required"],
      },
    });

    render(<NewIngredientDialog onClose={vi.fn()} onSaved={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Add ingredient" }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    const name = screen.getByLabelText("Name");
    await waitFor(() => expect(name).toHaveAttribute("aria-invalid", "true"));
    expect(name).toHaveAccessibleDescription("Name is required");
    expect(screen.getByLabelText("Calories (kcal)")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("shows a form error as an alert", async () => {
    const user = userEvent.setup();
    respondWith({
      status: "error",
      resetKey: 0,
      formError: "The ingredient could not be saved. Please try again.",
    });

    render(<NewIngredientDialog onClose={vi.fn()} onSaved={vi.fn()} />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Add ingredient" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The ingredient could not be saved. Please try again.",
    );
  });

  test("shows field errors on the inputs", async () => {
    const user = userEvent.setup();
    respondWith({
      status: "error",
      resetKey: 0,
      fieldErrors: { name: ["Name is required"] },
    });

    render(<NewIngredientDialog onClose={vi.fn()} onSaved={vi.fn()} />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Add ingredient" }));

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

    render(<NewIngredientDialog onClose={vi.fn()} onSaved={vi.fn()} />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Add ingredient" }));

    const name = await screen.findByLabelText("Name");
    await waitFor(() => expect(name).toHaveAttribute("aria-invalid", "true"));
    expect(name).toHaveValue("Cod");
    expect(screen.getByLabelText("Calories (kcal)")).toHaveValue(82);
    expect(screen.getByLabelText("Protein (g)")).toHaveValue(17.8);
    expect(screen.getByLabelText("Carbs (g)")).toHaveValue(0);
    expect(screen.getByLabelText("Fat (g)")).toHaveValue(0.7);
  });

  test("clears the fields once the reset key moves on", async () => {
    const user = userEvent.setup();
    respondWith({ status: "success", resetKey: 1, savedName: "Cod" });

    render(<NewIngredientDialog onClose={vi.fn()} onSaved={vi.fn()} />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Add ingredient" }));

    await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue(""));
    expect(screen.getByLabelText("Calories (kcal)")).toHaveValue(null);
  });

  test("reports each save and goes back to the name for the next one", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    respondWith({ status: "success", resetKey: 1, savedName: "Cod" });
    render(<NewIngredientDialog onClose={vi.fn()} onSaved={onSaved} />);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Add ingredient" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("Cod"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Name")).toHaveFocus());
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });

  test("does not report a save that failed", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    respondWith({ status: "error", resetKey: 0, formError: "Could not save" });
    render(<NewIngredientDialog onClose={vi.fn()} onSaved={onSaved} />);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Add ingredient" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save",
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  test("calls onClose once closed", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    respondWith(initialIngredientFormState);
    render(<NewIngredientDialog onClose={onClose} onSaved={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Done" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
