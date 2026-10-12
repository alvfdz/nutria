import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import GoalsPage from "@/app/goals/page";
import { getGoals } from "@/lib/goals/repository";
import type { Goals } from "@/lib/goals/types";
import { makeGoals } from "@test/factories";

vi.mock("@/lib/goals/repository", () => ({
  getGoals: vi.fn(),
  saveGoals: vi.fn(),
}));
// `next/cache` only exists in the server runtime; `@/app/goals/actions` is
// pulled in transitively by the form, never called here.
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
});

/** Answers the repository, then resolves the page element to render. */
async function renderPage(goals: Goals | null) {
  vi.mocked(getGoals).mockResolvedValue(goals);

  render(await GoalsPage());
}

describe("GoalsPage", () => {
  test("shows the heading and the description of the section", async () => {
    await renderPage(null);

    expect(
      screen.getByRole("heading", { level: 1, name: "Goals" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your daily macro budget: calories, protein, carbs and fat.",
      ),
    ).toBeInTheDocument();
  });

  test("renders the setup form seeded with defaults when no goals exist", async () => {
    await renderPage(null);

    expect(screen.getByText("Set your daily goals")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Set goals" }),
    ).toBeInTheDocument();

    // The default seed: 3 meals, balanced shares.
    expect(screen.getByLabelText("Meals per day")).toHaveTextContent("3");
    const calories = screen.getByLabelText(
      "Calories (kcal)",
    ) as HTMLInputElement;
    expect(calories.value).toBe("2000");
    expect(screen.getByLabelText("Protein %")).toHaveValue(30);
    expect(screen.getByLabelText("Carbs %")).toHaveValue(40);
    expect(screen.getByLabelText("Fat %")).toHaveValue(30);

    expect(screen.getByLabelText("Meal 1 name")).toHaveValue("Breakfast");
    expect(screen.getByLabelText("Meal 2 name")).toHaveValue("Lunch");
    expect(screen.getByLabelText("Meal 3 name")).toHaveValue("Dinner");
  });

  test("prefills the form from the stored goals and shows the live summary", async () => {
    await renderPage(makeGoals());

    expect(screen.getByText("Daily goals")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save goals" }),
    ).toBeInTheDocument();

    const calories = screen.getByLabelText(
      "Calories (kcal)",
    ) as HTMLInputElement;
    expect(calories.value).toBe("2000");
    expect(screen.getByLabelText("Protein %")).toHaveValue(30);
    expect(screen.getByLabelText("Carbs %")).toHaveValue(40);
    expect(screen.getByLabelText("Fat %")).toHaveValue(30);

    // Seed slots with their stored names.
    expect(screen.getByLabelText("Meal 1 name")).toHaveValue("Breakfast");
    expect(screen.getByLabelText("Meal 2 name")).toHaveValue("Lunch");
    expect(screen.getByLabelText("Meal 3 name")).toHaveValue("Dinner");
    expect(screen.getByLabelText("Meal 1 share (%)")).toHaveValue(30);

    // Daily grams via the 4/4/9 rule: 2000 kcal at 30/40/30.
    expect(screen.getByText("Live summary")).toBeInTheDocument();
    expect(screen.getByText("2000")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
    expect(screen.getByText("66.7")).toBeInTheDocument();

    // Per-meal slices: Breakfast and Dinner 600 kcal, Lunch 800 kcal.
    expect(
      screen.getAllByText(/600\s*kcal · P 45 g · C 60 g · F 20 g/),
    ).toHaveLength(2);
    expect(
      screen.getByText(/800\s*kcal · P 60 g · C 80 g · F 26\.7 g/),
    ).toBeInTheDocument();
  });

  test("loads the goals from the repository once", async () => {
    await renderPage(null);

    expect(getGoals).toHaveBeenCalledOnce();
  });
});
