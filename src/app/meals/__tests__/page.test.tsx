import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import MealsPage from "@/app/meals/page";

describe("MealsPage", () => {
  test("explains what a meal is", () => {
    render(<MealsPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Meals" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("A meal is a set of ingredients"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Give a group of ingredients a name and a quantity each, and its macros total themselves.",
      ),
    ).toBeInTheDocument();
  });

  test("sends the user to the ingredient library to get started", () => {
    render(<MealsPage />);

    expect(
      screen.getByRole("link", { name: "Add ingredients first" }),
    ).toHaveAttribute("href", "/ingredients");
  });
});
