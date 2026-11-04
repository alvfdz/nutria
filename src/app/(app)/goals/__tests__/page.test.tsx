import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import GoalsPage from "@/app/(app)/goals/page";
import { requireUser } from "@/lib/auth/session";
import { getGoals } from "@/lib/goals/repository";
import { getSlotPlanUsage } from "@/lib/plan/repository";
import type { Goals } from "@/lib/goals/types";
import { makeGoals, testUser } from "@test/factories";

vi.mock("@/lib/goals/repository", () => ({
  getGoals: vi.fn(),
  saveGoals: vi.fn(),
}));
// `next/cache` only exists in the server runtime; `@/app/(app)/goals/actions` is
// pulled in transitively by the form, never called here.
vi.mock("next/cache", () => ({ refresh: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/plan/repository", () => ({ getSlotPlanUsage: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireUser).mockResolvedValue(testUser);
  vi.mocked(getSlotPlanUsage).mockResolvedValue({});
});

/** Answers the repository, then resolves the page element to render. */
async function renderPage(goals: Goals | null) {
  vi.mocked(getGoals).mockResolvedValue(goals);

  render(await GoalsPage());
}

describe("GoalsPage", () => {
  test("reads the signed-in user's goals", async () => {
    await renderPage(null);

    expect(getGoals).toHaveBeenCalledWith(testUser.id);
    expect(getSlotPlanUsage).toHaveBeenCalledWith(testUser.id);
  });

  test("stops at the sign-in redirect before reading any goals", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    vi.mocked(requireUser).mockRejectedValue(redirect);

    await expect(GoalsPage()).rejects.toBe(redirect);
    expect(getGoals).not.toHaveBeenCalled();
  });

  test("shows the heading and the description of the section", async () => {
    await renderPage(null);

    expect(
      screen.getByRole("heading", { level: 1, name: "Goals" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your daily calorie budget, split across macros and meals.",
      ),
    ).toBeInTheDocument();
  });

  test("renders the setup form seeded with defaults when no goals exist", async () => {
    await renderPage(null);

    expect(screen.getByText("Set your daily goals")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Set goals" }),
    ).toBeInTheDocument();

    // The default seed: 4 meals, balanced shares.
    expect(screen.getAllByLabelText(/^Meal \d+ name$/)).toHaveLength(4);
    expect(screen.getByText(/Start from these defaults/)).toBeInTheDocument();
    const calories = screen.getByLabelText(
      "Calories (kcal)",
    ) as HTMLInputElement;
    expect(calories.value).toBe("2000");
    // Inside the WHO adult ranges.
    expect(screen.getByLabelText("Protein %")).toHaveValue(15);
    expect(screen.getByLabelText("Carbs %")).toHaveValue(60);
    expect(screen.getByLabelText("Fat %")).toHaveValue(25);

    expect(screen.getByLabelText("Meal 1 name")).toHaveValue("Breakfast");
    expect(screen.getByLabelText("Meal 2 name")).toHaveValue("Lunch");
    expect(screen.getByLabelText("Meal 3 name")).toHaveValue("Snack");
    expect(screen.getByLabelText("Meal 4 name")).toHaveValue("Dinner");
  });

  test("prefills the form from the stored goals and shows the summary", async () => {
    await renderPage(makeGoals());

    expect(screen.getByText("Daily goals")).toBeInTheDocument();
    expect(
      screen.queryByText(/Start from these defaults/),
    ).not.toBeInTheDocument();
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
    expect(screen.getByText("Your day")).toBeInTheDocument();
    expect(screen.getByText("2000")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
    expect(screen.getByText("67")).toBeInTheDocument();

    // Per-meal slices: Breakfast and Dinner 600 kcal, Lunch 800 kcal.
    const cells = (name: string) =>
      Array.from(
        screen.getByRole("cell", { name }).closest("tr")?.cells ?? [],
      ).map((cell) => cell.textContent);
    expect(cells("Breakfast")).toEqual(["Breakfast", "600", "45", "60", "20"]);
    expect(cells("Lunch")).toEqual(["Lunch", "800", "60", "80", "27"]);
  });

  test("loads the goals from the repository once", async () => {
    await renderPage(null);

    expect(getGoals).toHaveBeenCalledOnce();
  });
});
