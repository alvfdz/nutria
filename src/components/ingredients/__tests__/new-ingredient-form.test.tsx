import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ingredientDefaults } from "@test/factories";
import { createIngredientAction } from "@/app/ingredients/actions";
import { NewIngredientForm } from "@/components/ingredients/new-ingredient-form";
import {
  initialIngredientFormState,
  type IngredientFormState,
} from "@/lib/ingredients/form-state";

vi.mock("@/app/ingredients/actions", () => ({
  createIngredientAction: vi.fn(),
}));

const action = vi.mocked(createIngredientAction);

/** Answers the next submit with `state`, ignoring what was submitted. */
const respondWith = (state: IngredientFormState) => {
  action.mockImplementation(async () => state);
};

const fillForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText("Name"), "Cod");
  await user.type(screen.getByLabelText("Calories (kcal)"), "82");
  await user.type(screen.getByLabelText("Protein (g)"), "17.8");
  await user.type(screen.getByLabelText("Carbohydrates (g)"), "0");
  await user.type(screen.getByLabelText("Fat (g)"), "0.7");
};

beforeEach(() => {
  action.mockReset();
});

describe("NewIngredientForm", () => {
  test("renders the ingredient fields and the submit button", () => {
    respondWith(initialIngredientFormState);
    render(<NewIngredientForm />);

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

    render(<NewIngredientForm />);
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

  test("does not submit while a field is empty", async () => {
    const user = userEvent.setup();
    respondWith(initialIngredientFormState);

    render(<NewIngredientForm />);
    await user.click(screen.getByRole("button", { name: "Add ingredient" }));

    expect(action).not.toHaveBeenCalled();
  });

  test("shows a form error as an alert", async () => {
    const user = userEvent.setup();
    respondWith({
      status: "error",
      resetKey: 0,
      formError: "The ingredient could not be saved. Please try again.",
    });

    render(<NewIngredientForm />);
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

    render(<NewIngredientForm />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Add ingredient" }));

    const name = await screen.findByLabelText("Name");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription("Name is required");
  });

  test("announces the saved name in a live region", async () => {
    const user = userEvent.setup();
    respondWith({
      status: "success",
      resetKey: 1,
      savedName: ingredientDefaults.name,
    });

    render(<NewIngredientForm />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Add ingredient" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      `${ingredientDefaults.name} added to your ingredient library.`,
    );
  });

  test("says nothing in the live region before a successful save", () => {
    respondWith(initialIngredientFormState);
    render(<NewIngredientForm />);

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  test("clears the fields once the reset key moves on", async () => {
    const user = userEvent.setup();
    respondWith({ status: "success", resetKey: 1, savedName: "Cod" });

    render(<NewIngredientForm />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Add ingredient" }));

    await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue(""));
    expect(screen.getByLabelText("Calories (kcal)")).toHaveValue(null);
  });
});
