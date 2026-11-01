import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { makeIngredient } from "@test/factories";
import { IngredientFields } from "@/components/ingredients/ingredient-fields";

const labels = {
  name: "Name",
  calories: "Calories (kcal)",
  protein: "Protein (g)",
  carbs: "Carbs (g)",
  fat: "Fat (g)",
} as const;

describe("IngredientFields", () => {
  test("renders the name and the four macro inputs", () => {
    render(<IngredientFields fieldErrors={{}} />);

    expect(screen.getByLabelText(labels.name)).toBeInTheDocument();
    expect(screen.getByLabelText(labels.calories)).toBeInTheDocument();
    expect(screen.getByLabelText(labels.protein)).toBeInTheDocument();
    expect(screen.getByLabelText(labels.carbs)).toBeInTheDocument();
    expect(screen.getByLabelText(labels.fat)).toBeInTheDocument();
  });

  test("names the inputs so the action can read the submission", () => {
    render(<IngredientFields fieldErrors={{}} />);

    expect(screen.getByLabelText(labels.name)).toHaveAttribute("name", "name");
    expect(screen.getByLabelText(labels.calories)).toHaveAttribute(
      "name",
      "caloriesPer100g",
    );
  });

  test("starts empty when no ingredient is given", () => {
    render(<IngredientFields fieldErrors={{}} />);

    expect(screen.getByLabelText(labels.name)).toHaveValue("");
    for (const label of [
      labels.calories,
      labels.protein,
      labels.carbs,
      labels.fat,
    ]) {
      expect(screen.getByLabelText(label)).toHaveValue(null);
    }
  });

  test("seeds the inputs from the ingredient, macros through formatMacro", () => {
    const ingredient = makeIngredient({
      name: "Chicken breast, raw",
      caloriesPer100g: 165,
      proteinPer100g: 31.5,
      carbsPer100g: 0,
      fatPer100g: 3.6,
    });

    render(<IngredientFields ingredient={ingredient} fieldErrors={{}} />);

    expect(screen.getByLabelText(labels.name)).toHaveValue(
      "Chicken breast, raw",
    );
    expect(screen.getByLabelText(labels.calories)).toHaveValue(165);
    expect(screen.getByLabelText(labels.protein)).toHaveValue(31.5);
    expect(screen.getByLabelText(labels.carbs)).toHaveValue(0);
    expect(screen.getByLabelText(labels.fat)).toHaveValue(3.6);
  });

  test("marks a field invalid and describes it with its first message", () => {
    render(
      <IngredientFields
        fieldErrors={{ caloriesPer100g: ["Calories cannot be negative"] }}
      />,
    );

    const input = screen.getByLabelText(labels.calories);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Calories cannot be negative");
  });

  test("leaves a valid field undecorated", () => {
    render(<IngredientFields fieldErrors={{ caloriesPer100g: undefined }} />);

    const input = screen.getByLabelText(labels.calories);
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  test("decorates only the fields that have messages", () => {
    render(
      <IngredientFields
        fieldErrors={{
          name: ["Name is required"],
          fatPer100g: ["Fat is required"],
        }}
      />,
    );

    expect(screen.getByLabelText(labels.name)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText(labels.fat)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText(labels.calories)).not.toHaveAttribute(
      "aria-invalid",
    );
  });

  test("shows only the first message of a field", () => {
    render(
      <IngredientFields
        fieldErrors={{
          proteinPer100g: ["Protein is required", "Protein must be a number"],
        }}
      />,
    );

    expect(screen.getByText("Protein is required")).toBeInTheDocument();
    expect(
      screen.queryByText("Protein must be a number"),
    ).not.toBeInTheDocument();
  });

  test("relies on server-side validation instead of native constraints", () => {
    render(<IngredientFields fieldErrors={{}} />);

    for (const label of [
      labels.name,
      labels.calories,
      labels.protein,
      labels.carbs,
      labels.fat,
    ]) {
      const input = screen.getByLabelText(label);
      expect(input).not.toHaveAttribute("required");
      expect(input).not.toHaveAttribute("min");
      expect(input).not.toHaveAttribute("max");
    }
  });

  test("keeps ids stable across renders when given a prefix", () => {
    const { rerender } = render(
      <IngredientFields fieldErrors={{}} idPrefix="edit" />,
    );
    const nameId = screen.getByLabelText(labels.name).getAttribute("id");

    rerender(<IngredientFields fieldErrors={{}} idPrefix="edit" />);

    expect(screen.getByLabelText(labels.name).getAttribute("id")).toBe(nameId);
  });
});
