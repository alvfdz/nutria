import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import GoalsPage from "@/app/goals/page";

describe("GoalsPage", () => {
  test("shows the heading and the description of the section", () => {
    render(<GoalsPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Goals" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your daily macro budget: calories, protein, carbs and fat.",
      ),
    ).toBeInTheDocument();
  });

  test("renders the placeholder card while targets are unavailable", () => {
    render(<GoalsPage />);

    expect(
      screen.getByText("Daily targets are coming soon"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Soon you'll set your total daily goals here, and every meal you plan will be measured against them.",
      ),
    ).toBeInTheDocument();
  });
});
