import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { makeIngredient, mealDefaults } from "@test/factories";
import { createMealAction } from "@/app/(app)/meals/actions";
import { NewMealForm } from "@/components/meals/new-meal-form";
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

describe("NewMealForm", () => {
  test("invites the user to the ingredient library when there is nothing to build from", () => {
    render(<NewMealForm ingredients={[]} />);

    expect(
      screen.getByRole("link", { name: "Add ingredients first" }),
    ).toHaveAttribute("href", "/ingredients");
    expect(
      screen.getByText("A meal is a set of ingredients"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add meal" }),
    ).not.toBeInTheDocument();
  });

  test("renders the name field and one builder row when ingredients exist", () => {
    render(<NewMealForm ingredients={[oats, milk]} />);

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Ingredient 1" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Ingredient 2")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Grams 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add meal" })).toBeEnabled();
    expect(
      screen.queryByRole("link", { name: "Add ingredients first" }),
    ).not.toBeInTheDocument();
  });

  test("hands the submitted rows to the action", async () => {
    const user = userEvent.setup();
    let submitted: FormData | undefined;

    action.mockImplementation(async (_state, formData) => {
      submitted = formData;
      return initialMealFormState;
    });

    render(<NewMealForm ingredients={[oats, milk]} />);
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

    render(<NewMealForm ingredients={[oats, milk]} />);
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

    render(<NewMealForm ingredients={[oats, milk]} />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Add meal" }));

    const name = await screen.findByLabelText("Name");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription("Name is required");
  });

  test("keeps the entered values when validation fails", async () => {
    const user = userEvent.setup();
    respondWith({
      status: "error",
      resetKey: 0,
      fieldErrors: { name: ["Name is required"] },
    });

    render(<NewMealForm ingredients={[oats, milk]} />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Add meal" }));

    const name = await screen.findByLabelText("Name");
    await waitFor(() => expect(name).toHaveAttribute("aria-invalid", "true"));
    expect(name).toHaveValue(mealDefaults.name);
    expect(
      screen.getByRole("combobox", { name: "Ingredient 1" }),
    ).toHaveTextContent("Oats");
    expect(screen.getByLabelText("Grams 1")).toHaveValue(80);
    expect(
      screen.getByRole("combobox", { name: "Ingredient 2" }),
    ).toHaveTextContent("Milk");
    expect(screen.getByLabelText("Grams 2")).toHaveValue(250);
  });

  test("announces the saved name in a live region", async () => {
    const user = userEvent.setup();
    respondWith({
      status: "success",
      resetKey: 1,
      savedName: mealDefaults.name,
    });

    render(<NewMealForm ingredients={[oats, milk]} />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Add meal" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      `${mealDefaults.name} added to your meal library.`,
    );
  });

  test("says nothing in the live region before a successful save", () => {
    respondWith(initialMealFormState);
    render(<NewMealForm ingredients={[oats, milk]} />);

    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  test("clears the fields once the reset key moves on", async () => {
    const user = userEvent.setup();
    respondWith({ status: "success", resetKey: 1, savedName: "Porridge" });

    render(<NewMealForm ingredients={[oats, milk]} />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Add meal" }));

    await waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue(""));
    expect(screen.getByLabelText("Grams 1")).toHaveValue(null);
    expect(screen.queryByLabelText("Grams 2")).not.toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Ingredient 1" }),
    ).toHaveTextContent("Select ingredient");
  });
});
