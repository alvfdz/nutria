import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { toast } from "sonner";

import { saveGoalsAction } from "@/app/goals/actions";
import { GoalsView } from "@/components/goals/goals-form";
import { makeGoals } from "@test/factories";

// `@/app/goals/actions` pulls in the `server-only` repository; the tests stub
// the action instead, so a fake is enough.
vi.mock("@/app/goals/actions", () => ({ saveGoalsAction: vi.fn() }));

// The real sonner module only feeds the toast container, which these tests do
// not render; mocking it keeps the calls assertable.
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

const action = vi.mocked(saveGoalsAction);

beforeEach(() => {
  action.mockReset();
  vi.mocked(toast.success).mockClear();
});

/** The share inputs of every meal row, as numbers. */
const shares = () =>
  screen
    .getAllByLabelText(/share \(%\)/)
    .map((input) => Number((input as HTMLInputElement).value));

/** The meal names the live summary lists, top to bottom. */
const summaryMeals = () =>
  screen
    .getAllByRole("listitem")
    .map((item) => item.querySelector("span")?.textContent);

describe("GoalsView", () => {
  test("starts with three default meals when no goals are stored", () => {
    render(<GoalsView goals={null} />);

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
    render(<GoalsView goals={makeGoals()} />);

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
    render(<GoalsView goals={null} />);

    expect(screen.getByLabelText("Meals per day")).toHaveTextContent("3");
    // No number input offers a second way to change the count.
    expect(
      screen.queryByRole("spinbutton", { name: "Meals per day" }),
    ).not.toBeInTheDocument();
  });

  test("rebalances every share to 100 / count as meals are added", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={null} />);

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
    render(<GoalsView goals={null} />);

    await user.click(screen.getByRole("button", { name: "Add meal" }));

    expect(screen.getByLabelText("Meal 4 name")).toHaveValue("Meal 4");
    expect(shares().reduce((sum, value) => sum + value, 0)).toBeCloseTo(100);
  });

  test("removes a meal and rebalances the rows that stay", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={null} />);

    expect(screen.getByRole("button", { name: "Remove meal 3" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Remove meal 3" }));

    expect(screen.queryByLabelText("Meal 3 name")).not.toBeInTheDocument();
    expect(shares()).toEqual([50, 50]);
  });

  test("disables removal once only one meal remains", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={null} />);

    await user.click(screen.getByRole("button", { name: "Remove meal 3" }));
    await user.click(screen.getByRole("button", { name: "Remove meal 2" }));

    expect(
      screen.getByRole("button", { name: "Remove meal 1" }),
    ).toBeDisabled();
    expect(shares()).toEqual([100]);
  });

  test("edits a slot name and share in place", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);

    await user.clear(screen.getByLabelText("Meal 1 name"));
    await user.type(screen.getByLabelText("Meal 1 name"), "Brunch");
    await user.clear(screen.getByLabelText("Meal 1 share (%)"));
    await user.type(screen.getByLabelText("Meal 1 share (%)"), "50");

    expect(screen.getByLabelText("Meal 1 name")).toHaveValue("Brunch");
    expect(screen.getByLabelText("Meal 1 share (%)")).toHaveValue(50);
  });

  test("updates the live summary as the calorie target changes", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={null} />);

    // 2000 kcal at 30% protein → 150 g.
    expect(screen.getByText("150")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Calories (kcal)"));
    await user.type(screen.getByLabelText("Calories (kcal)"), "2500");

    // 2500 × 30% / 4 = 187.5 g.
    expect(screen.getByText("187.5")).toBeInTheDocument();
    expect(screen.getByText("2500")).toBeInTheDocument();
  });

  test("moves a meal up and carries its name and share with it", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={null} />);

    await user.click(screen.getByRole("button", { name: "Move meal 2 up" }));

    // Lunch swaps into first place, taking its 40% share along.
    expect(screen.getByLabelText("Meal 1 name")).toHaveValue("Lunch");
    expect(screen.getByLabelText("Meal 1 share (%)")).toHaveValue(40);
    expect(screen.getByLabelText("Meal 2 name")).toHaveValue("Breakfast");
    expect(screen.getByLabelText("Meal 2 share (%)")).toHaveValue(30);
  });

  test("moves a meal down and keeps the live summary in step", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={null} />);

    expect(summaryMeals()).toEqual(["Breakfast", "Lunch", "Dinner"]);

    await user.click(screen.getByRole("button", { name: "Move meal 1 down" }));

    expect(screen.getByLabelText("Meal 1 name")).toHaveValue("Lunch");
    expect(screen.getByLabelText("Meal 2 name")).toHaveValue("Breakfast");
    expect(summaryMeals()).toEqual(["Lunch", "Breakfast", "Dinner"]);
  });

  test("disables the move buttons at the ends of the list", () => {
    render(<GoalsView goals={null} />);

    expect(
      screen.getByRole("button", { name: "Move meal 1 up" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Move meal 3 down" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Move meal 1 down" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Move meal 3 up" }),
    ).toBeEnabled();
  });

  test("announces the new position after a move", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={null} />);

    await user.click(screen.getByRole("button", { name: "Move meal 2 up" }));

    expect(screen.getByText("Lunch moved to position 1")).toBeInTheDocument();
  });

  test("toasts the saved message once a save succeeds", async () => {
    const user = userEvent.setup();
    action.mockImplementation(async () => ({
      status: "success",
      resetKey: 1,
      savedMessage: "Goals saved.",
    }));

    render(<GoalsView goals={makeGoals()} />);
    await user.click(screen.getByRole("button", { name: "Save goals" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    expect(toast.success).toHaveBeenCalledWith("Goals saved.");
    // The live region keeps the same message for screen readers.
    expect(screen.getByText("Goals saved.")).toBeInTheDocument();
  });

  test("shows a failed save inline, without a success toast", async () => {
    const user = userEvent.setup();
    action.mockImplementation(async () => ({
      status: "error",
      resetKey: 0,
      formError: "The goals could not be saved. Please try again.",
    }));

    render(<GoalsView goals={makeGoals()} />);
    await user.click(screen.getByRole("button", { name: "Save goals" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The goals could not be saved. Please try again.",
    );
    expect(toast.success).not.toHaveBeenCalled();
  });
});
