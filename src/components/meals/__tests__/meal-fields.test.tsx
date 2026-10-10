import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { MealFields } from "@/components/meals/meal-fields";
import type { Meal } from "@/lib/meals/types";
import { makeIngredient } from "@test/factories";

const ingredients = [
  makeIngredient({ id: "ing-oats", name: "Oats" }),
  makeIngredient({ id: "ing-milk", name: "Milk" }),
  makeIngredient({ id: "ing-whey", name: "Whey Protein" }),
];

/** The live preview's four values, in builder order, as rendered text. */
const definitions = () =>
  screen.getAllByRole("definition").map((node) => node.textContent);

describe("MealFields", () => {
  test("starts with one empty row", () => {
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    expect(screen.getByLabelText("Ingredient 1")).toBeInTheDocument();
    expect(screen.queryByLabelText("Ingredient 2")).not.toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Ingredient 1" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Grams 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  test("picks an ingredient from the select popup", async () => {
    const user = userEvent.setup();
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    await user.click(screen.getByRole("combobox", { name: "Ingredient 1" }));
    await user.click(await screen.findByRole("option", { name: "Oats" }));

    expect(
      screen.getByRole("combobox", { name: "Ingredient 1" }),
    ).toHaveTextContent("Oats");
  });

  test("lists every ingredient as an option", async () => {
    const user = userEvent.setup();
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    await user.click(screen.getByRole("combobox", { name: "Ingredient 1" }));
    const listbox = await screen.findByRole("listbox");

    for (const ingredient of ingredients) {
      expect(
        within(listbox).getByRole("option", { name: ingredient.name }),
      ).toBeInTheDocument();
    }
  });

  test("adds a row and keeps the previous row's values", async () => {
    const user = userEvent.setup();
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    await user.type(screen.getByLabelText("Grams 1"), "250");
    await user.click(screen.getByRole("button", { name: "Add ingredient" }));

    expect(screen.getByLabelText("Ingredient 2")).toBeInTheDocument();
    expect(screen.getByLabelText("Grams 1")).toHaveValue(250);
    expect(screen.getByLabelText("Grams 2")).toHaveValue(null);
  });

  test("removes a row and renumbers the rest", async () => {
    const user = userEvent.setup();
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    await user.click(screen.getByRole("button", { name: "Add ingredient" }));
    expect(screen.getByLabelText("Ingredient 2")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Remove ingredient 1" }),
    );

    expect(screen.queryByLabelText("Ingredient 2")).not.toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Ingredient 1" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Grams 1")).toBeInTheDocument();
  });

  test("seeds the rows and the name from an existing meal", () => {
    const meal: Meal = {
      id: "meal-1",
      name: "Porridge",
      createdAt: "2026-01-01T00:00:00.000Z",
      items: [
        {
          id: "meal-item-1",
          sortOrder: 0,
          ingredientId: "ing-oats",
          grams: 80,
          ingredient: ingredients[0],
        },
        {
          id: "meal-item-2",
          sortOrder: 1,
          ingredientId: "ing-milk",
          grams: 250,
          ingredient: ingredients[1],
        },
      ],
    };

    render(
      <MealFields meal={meal} ingredients={ingredients} fieldErrors={{}} />,
    );

    expect(screen.getByLabelText("Name")).toHaveValue("Porridge");
    expect(
      screen.getByRole("combobox", { name: "Ingredient 1" }),
    ).toHaveTextContent("Oats");
    expect(screen.getByLabelText("Grams 1")).toHaveValue(80);
    expect(
      screen.getByRole("combobox", { name: "Ingredient 2" }),
    ).toHaveTextContent("Milk");
    expect(screen.getByLabelText("Grams 2")).toHaveValue(250);
  });

  test("renders field errors next to the offending field", () => {
    render(
      <MealFields
        ingredients={ingredients}
        fieldErrors={{
          name: ["Name is required."],
          "items.0.ingredientId": ["Pick an ingredient."],
          "items.0.grams": ["Grams must be at least 1."],
          items: ["Each row needs grams."],
        }}
      />,
    );

    expect(screen.getByText("Name is required.")).toBeInTheDocument();
    expect(screen.getByText("Pick an ingredient.")).toBeInTheDocument();
    expect(screen.getByText("Grams must be at least 1.")).toBeInTheDocument();
    expect(screen.getByText("Each row needs grams.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(
      screen.getByRole("combobox", { name: "Ingredient 1" }),
    ).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Grams 1")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("submits one hidden ingredientId and grams pair per row", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <MealFields ingredients={ingredients} fieldErrors={{}} />
      </form>,
    );
    const form = container.querySelector("form")!;

    await user.click(screen.getByRole("button", { name: "Add ingredient" }));
    await user.type(screen.getByLabelText("Grams 1"), "80");
    await user.type(screen.getByLabelText("Grams 2"), "250");

    const data = new FormData(form as HTMLFormElement);

    expect(data.getAll("ingredientId")).toHaveLength(2);
    expect(data.getAll("grams")).toEqual(["80", "250"]);
    expect(data.get("name")).toBe("");
  });

  test("previews zeroes before anything is entered", () => {
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    expect(definitions()).toEqual(["0 kcal", "0 g", "0 g", "0 g"]);
  });

  test("previews the totals of the rows entered so far", async () => {
    const user = userEvent.setup();
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    await user.click(screen.getByRole("combobox", { name: "Ingredient 1" }));
    await user.click(await screen.findByRole("option", { name: "Oats" }));
    await user.type(screen.getByLabelText("Grams 1"), "200");

    // Oats carries the factory's 165 kcal / 31.5 p / 0 c / 3.6 f per 100 g.
    expect(definitions()).toEqual(["330 kcal", "63 g", "0 g", "7.2 g"]);
  });

  test("ignores rows missing an ingredient or a quantity", async () => {
    const user = userEvent.setup();
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    await user.type(screen.getByLabelText("Grams 1"), "200");
    expect(definitions()).toEqual(["0 kcal", "0 g", "0 g", "0 g"]);

    await user.click(screen.getByRole("combobox", { name: "Ingredient 1" }));
    await user.click(await screen.findByRole("option", { name: "Oats" }));
    await user.clear(screen.getByLabelText("Grams 1"));

    expect(definitions()).toEqual(["0 kcal", "0 g", "0 g", "0 g"]);
  });

  test("shows a gram unit inside each quantity field", () => {
    render(<MealFields ingredients={ingredients} fieldErrors={{}} />);

    const grams = screen.getByLabelText("Grams 1");
    expect(within(grams.parentElement!).getByText("g")).toBeInTheDocument();
  });

  test("drops the hidden inputs of a removed row", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <form>
        <MealFields ingredients={ingredients} fieldErrors={{}} />
      </form>,
    );
    const form = container.querySelector("form")!;

    await user.click(screen.getByRole("button", { name: "Add ingredient" }));
    await user.click(
      screen.getByRole("button", { name: "Remove ingredient 1" }),
    );

    const data = new FormData(form as HTMLFormElement);

    expect(data.getAll("ingredientId")).toHaveLength(1);
    expect(data.getAll("grams")).toHaveLength(1);
  });
});
