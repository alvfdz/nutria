import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { markTutorialSeenAction } from "@/app/(app)/actions";
import { WelcomeTutorial } from "@/components/welcome-tutorial";
import { TUTORIAL_STEPS } from "@/lib/tutorial/steps";

const replace = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/app/(app)/actions", () => ({ markTutorialSeenAction: vi.fn() }));

const seen = vi.mocked(markTutorialSeenAction);

/** Clicks Next until the last step shows. */
async function goToLastStep(user: ReturnType<typeof userEvent.setup>) {
  for (let i = 1; i < TUTORIAL_STEPS.length; i += 1) {
    await user.click(screen.getByRole("button", { name: "Next" }));
  }
}

beforeEach(() => {
  vi.resetAllMocks();
  seen.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("WelcomeTutorial", () => {
  test("starts on the first step, with no way back", () => {
    render(<WelcomeTutorial hasGoals={false} />);

    expect(
      screen.getByRole("dialog", { name: "Welcome to Nutria" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    expect(screen.getByText("Set your budget")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Back" }),
    ).not.toBeInTheDocument();
  });

  test("puts focus on Next, so Enter moves on rather than skipping", async () => {
    const user = userEvent.setup();
    render(<WelcomeTutorial hasGoals={false} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();
    });

    await user.keyboard("{Enter}");

    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
    expect(seen).not.toHaveBeenCalled();
  });

  test("steps forward and back", async () => {
    const user = userEvent.setup();
    render(<WelcomeTutorial hasGoals={false} />);

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
    expect(screen.getByText("Build your library")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    expect(seen).not.toHaveBeenCalled();
  });

  test("announces step changes politely", () => {
    render(<WelcomeTutorial hasGoals={false} />);

    expect(screen.getByText("Step 1 of 4").parentElement).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  test("the last step has no Next or Skip", async () => {
    const user = userEvent.setup();
    render(<WelcomeTutorial hasGoals />);

    await goToLastStep(user);

    expect(screen.getByText("Step 4 of 4")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Next" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Skip" }),
    ).not.toBeInTheDocument();
  });

  test("ends on setting a budget when there is none", async () => {
    const user = userEvent.setup();
    render(<WelcomeTutorial hasGoals={false} />);

    await goToLastStep(user);
    await user.click(screen.getByRole("button", { name: "Set your budget" }));

    expect(seen).toHaveBeenCalledOnce();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/goals"));
  });

  test("ends on Done when a budget exists", async () => {
    const user = userEvent.setup();
    render(<WelcomeTutorial hasGoals />);

    await goToLastStep(user);
    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(seen).toHaveBeenCalledOnce();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  test("Skip counts as seen and clears the query", async () => {
    const user = userEvent.setup();
    render(<WelcomeTutorial hasGoals={false} />);

    await user.click(screen.getByRole("button", { name: "Skip" }));

    expect(seen).toHaveBeenCalledOnce();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  test("Escape counts as seen", async () => {
    const user = userEvent.setup();
    render(<WelcomeTutorial hasGoals={false} />);

    await user.keyboard("{Escape}");

    await waitFor(() => expect(seen).toHaveBeenCalledOnce());
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  test("waits for the save before moving on", async () => {
    const user = userEvent.setup();
    let finish = () => {};
    seen.mockReturnValue(
      new Promise((resolve) => {
        finish = () => resolve();
      }),
    );
    render(<WelcomeTutorial hasGoals={false} />);

    await user.click(screen.getByRole("button", { name: "Skip" }));

    expect(replace).not.toHaveBeenCalled();

    finish();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });

  test("a failed save still closes and moves on", async () => {
    const user = userEvent.setup();
    seen.mockRejectedValue(new Error("offline"));
    render(<WelcomeTutorial hasGoals={false} />);

    await user.click(screen.getByRole("button", { name: "Skip" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
