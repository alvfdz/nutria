import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { GoalsForm } from "@/components/goals/goals-form";
import { makeGoals } from "@test/factories";

// `@/app/goals/actions` pulls in the `server-only` repository; the form never
// submits in these tests, so a stub action is enough.
vi.mock("@/app/goals/actions", () => ({ saveGoalsAction: vi.fn() }));

/** The share inputs of every meal row, as numbers. */
const shares = () =>
  screen
    .getAllByLabelText(/share \(%\)/)
    .map((input) => Number((input as HTMLInputElement).value));

describe("GoalsForm", () => {
  test("starts with three default meals when no goals are stored", () => {
    render(<GoalsForm goals={null} />);

    expect(screen.getByLabelText("Meals per day")).toHaveTextContent("3");
    expect(screen.getByLabelText("Calories (kcal)")).toHaveValue(2000);
    expect(screen.getByLabelText("Meal 1 name")).toHaveValue("Breakfast");
    expect(screen.getByLabelText("Meal 2 name")).toHaveValue("Lunch");
    expect(screen.getByLabelText("Meal 3 name")).toHaveValue("Dinner");
    expect(
      screen.getByRole("button", { name: "Set goals" }),
    ).toBeInTheDocument();
  });

  test("seeds every field from the stored goals", () => {
    render(<GoalsForm goals={makeGoals()} />);

    expect(screen.getByLabelText("Calories (kcal)")).toHaveValue(2000);
    expect(screen.getByLabelText("Protein %")).toHaveValue(30);
    expect(screen.getByLabelText("Carbs %")).toHaveValue(40);
    expect(screen.getByLabelText("Fat %")).toHaveValue(30);
    expect(screen.getByLabelText("Meal 1 name")).toHaveValue("Breakfast");
    expect(screen.getByLabelText("Meal 3 name")).toHaveValue("Dinner");
    expect(
      screen.getByRole("button", { name: "Save goals" }),
    ).toBeInTheDocument();
  });

  test("shows the meal count as read-only text derived from the rows", () => {
    render(<GoalsForm goals={null} />);

    expect(screen.getByLabelText("Meals per day")).toHaveTextContent("3");
    // No number input offers a second way to change the count.
    expect(
      screen.queryByRole("spinbutton", { name: "Meals per day" }),
    ).not.toBeInTheDocument();
  });

  test("rebalances every share to 100 / count as meals are added", async () => {
    const user = userEvent.setup();
    render(<GoalsForm goals={null} />);

    await user.click(screen.getByRole("button", { name: "Add meal" }));
    await user.click(screen.getByRole("button", { name: "Add meal" }));

    expect(screen.getByLabelText("Meals per day")).toHaveTextContent("5");
    expect(screen.getByLabelText("Meal 4 name")).toHaveValue("Meal 4");
    expect(screen.getByLabelText("Meal 5 name")).toHaveValue("Meal 5");
    // 100 / 5 = 20% each.
    expect(shares()).toEqual([20, 20, 20, 20, 20]);
  });

  test("appends a row named Meal N and keeps the shares summing to 100", async () => {
    const user = userEvent.setup();
    render(<GoalsForm goals={null} />);

    await user.click(screen.getByRole("button", { name: "Add meal" }));

    expect(screen.getByLabelText("Meal 4 name")).toHaveValue("Meal 4");
    expect(shares().reduce((sum, value) => sum + value, 0)).toBeCloseTo(100);
  });

  test("removes a meal and rebalances the rows that stay", async () => {
    const user = userEvent.setup();
    render(<GoalsForm goals={null} />);

    expect(screen.getByRole("button", { name: "Remove meal 3" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Remove meal 3" }));

    expect(screen.queryByLabelText("Meal 3 name")).not.toBeInTheDocument();
    expect(shares()).toEqual([50, 50]);
  });

  test("disables removal once only one meal remains", async () => {
    const user = userEvent.setup();
    render(<GoalsForm goals={null} />);

    await user.click(screen.getByRole("button", { name: "Remove meal 3" }));
    await user.click(screen.getByRole("button", { name: "Remove meal 2" }));

    expect(
      screen.getByRole("button", { name: "Remove meal 1" }),
    ).toBeDisabled();
    expect(shares()).toEqual([100]);
  });

  test("edits a slot name and share in place", async () => {
    const user = userEvent.setup();
    render(<GoalsForm goals={makeGoals()} />);

    await user.clear(screen.getByLabelText("Meal 1 name"));
    await user.type(screen.getByLabelText("Meal 1 name"), "Brunch");
    await user.clear(screen.getByLabelText("Meal 1 share (%)"));
    await user.type(screen.getByLabelText("Meal 1 share (%)"), "50");

    expect(screen.getByLabelText("Meal 1 name")).toHaveValue("Brunch");
    expect(screen.getByLabelText("Meal 1 share (%)")).toHaveValue(50);
  });

  test("updates the live summary as the calorie target changes", async () => {
    const user = userEvent.setup();
    render(<GoalsForm goals={null} />);

    // 2000 kcal at 30% protein → 150 g.
    expect(screen.getByText("150")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Calories (kcal)"));
    await user.type(screen.getByLabelText("Calories (kcal)"), "2500");

    // 2500 × 30% / 4 = 187.5 g.
    expect(screen.getByText("187.5")).toBeInTheDocument();
    expect(screen.getByText("2500")).toBeInTheDocument();
  });
});
