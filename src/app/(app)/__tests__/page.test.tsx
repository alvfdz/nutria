import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import TodayPage from "@/app/(app)/page";
import { requireUser } from "@/lib/auth/session";
import { dbDateFromKey } from "@/lib/calendar/week";
import { getGoals } from "@/lib/goals/repository";
import type { Goals } from "@/lib/goals/types";
import { listMeals } from "@/lib/meals/repository";
import { getPlansForRange } from "@/lib/plan/repository";
import type { PlannedMeal } from "@/lib/plan/types";
import { hasSeenTutorial } from "@/lib/tutorial/repository";
import {
  makeGoals,
  makeMeal,
  makePlannedMeal,
  testUser,
} from "@test/factories";

vi.mock("@/lib/goals/repository", () => ({ getGoals: vi.fn() }));
vi.mock("@/lib/meals/repository", () => ({ listMeals: vi.fn() }));
vi.mock("@/lib/plan/repository", () => ({ getPlansForRange: vi.fn() }));
vi.mock("@/lib/tutorial/repository", () => ({ hasSeenTutorial: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireUser: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/app/(app)/actions", () => ({
  setMealEatenAction: vi.fn(),
  swapMealAction: vi.fn(),
  markTutorialSeenAction: vi.fn(),
}));
vi.mock("@/app/(app)/calendar/actions", () => ({ assignMealAction: vi.fn() }));

const TODAY = "2026-10-14";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 14, 12, 0, 0));
  vi.resetAllMocks();
  vi.mocked(requireUser).mockResolvedValue(testUser);
});

afterEach(() => {
  vi.useRealTimers();
});

/** The page's props, with an optional `?tutorial=` value. */
function pageProps(tutorial?: string) {
  return {
    params: Promise.resolve({}),
    searchParams: Promise.resolve(tutorial ? { tutorial } : {}),
  };
}

async function renderPage({
  goals = makeGoals(),
  plans = [],
  tutorialSeen = true,
  tutorial,
}: {
  goals?: Goals | null;
  plans?: PlannedMeal[];
  tutorialSeen?: boolean;
  tutorial?: string;
} = {}) {
  vi.mocked(getGoals).mockResolvedValue(goals);
  vi.mocked(listMeals).mockResolvedValue([makeMeal()]);
  vi.mocked(getPlansForRange).mockResolvedValue(plans);

  vi.mocked(hasSeenTutorial).mockResolvedValue(tutorialSeen);

  render(await TodayPage(pageProps(tutorial)));
}

describe("TodayPage", () => {
  test("titles the page with the date and links to the calendar", async () => {
    await renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Wednesday, 14 October" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Plan this week" }),
    ).toHaveAttribute("href", "/calendar");
    expect(
      screen.getByRole("link", { name: "Plan this week" }),
    ).not.toHaveClass("border-transparent");
  });

  test("points at goals when there's no budget yet", async () => {
    await renderPage({ goals: null });

    expect(screen.getByText("Set your budget first")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Set your budget" }),
    ).toHaveAttribute("href", "/goals");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  test("keeps the budget and links to the calendar with nothing planned", async () => {
    await renderPage();

    expect(
      screen.getByRole("heading", { level: 2, name: /kcal left/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Nothing planned today/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "plan it on the calendar" }),
    ).toHaveAttribute("href", "/calendar");
  });

  test("lists today's planned meal with its tick", async () => {
    const goals = makeGoals();

    await renderPage({
      goals,
      plans: [
        makePlannedMeal({
          date: TODAY,
          mealSlotId: goals.slots[0].id,
          eaten: true,
        }),
      ],
    });

    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.queryByText(/Nothing planned today/)).not.toBeInTheDocument();
  });

  test("reads only today, scoped to the user", async () => {
    await renderPage();

    const date = dbDateFromKey(TODAY);

    expect(getGoals).toHaveBeenCalledWith(testUser.id);
    expect(listMeals).toHaveBeenCalledWith(testUser.id);
    expect(getPlansForRange).toHaveBeenCalledWith(testUser.id, date, date);
  });

  test("stops at the sign-in redirect before reading any data", async () => {
    const redirect = new Error("NEXT_REDIRECT");
    vi.mocked(requireUser).mockRejectedValue(redirect);

    await expect(TodayPage(pageProps())).rejects.toBe(redirect);
    expect(getGoals).not.toHaveBeenCalled();
    expect(getPlansForRange).not.toHaveBeenCalled();
  });

  test("opens the tutorial for an owner who hasn't seen it", async () => {
    await renderPage({ tutorialSeen: false });

    expect(
      screen.getByRole("dialog", { name: "Welcome to Nutria" }),
    ).toBeInTheDocument();
    expect(hasSeenTutorial).toHaveBeenCalledWith(testUser.id);
  });

  test("opens the tutorial without goals too", async () => {
    await renderPage({ goals: null, tutorialSeen: false });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("leaves the tutorial closed once seen", async () => {
    await renderPage();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("opens a seen tutorial again on replay", async () => {
    await renderPage({ tutorial: "replay" });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("ignores any other tutorial value", async () => {
    await renderPage({ tutorial: "nope" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
