import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { toast } from "@/components/ui/toast";

import { saveGoalsAction } from "@/app/(app)/goals/actions";
import { GoalsView } from "@/components/goals/goals-form";
import { makeGoals } from "@test/factories";

// `@/app/(app)/goals/actions` pulls in the `server-only` repository; the tests stub
// the action instead, so a fake is enough.
vi.mock("@/app/(app)/goals/actions", () => ({ saveGoalsAction: vi.fn() }));

// The real toast manager only feeds the toast container, which these tests do
// not render; mocking it keeps the calls assertable.
vi.mock("@/components/ui/toast", () => ({ toast: { add: vi.fn() } }));

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const action = vi.mocked(saveGoalsAction);

beforeEach(() => {
  action.mockReset();
  vi.mocked(toast.add).mockClear();
  push.mockClear();
});

/** The share inputs of every meal row, as numbers. */
const shares = () =>
  screen
    .getAllByLabelText(/share \(%\)/)
    .map((input) => Number((input as HTMLInputElement).value));

/** The summary table's body rows, top to bottom. */
const summaryRows = () => screen.getAllByRole("row").slice(1);

/** The meal names the summary lists, top to bottom. */
const summaryMeals = () =>
  summaryRows().map((row) => row.querySelector("td")?.textContent);

/** How many meal rows the form shows. */
const mealCount = () => screen.getAllByLabelText(/^Meal \d+ name$/).length;

/** The stacked day bar's segments, left to right. */
const segments = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>('[data-slot="day-split-segment"]'),
  );

/** The bar's segment widths exactly as they reach the styles, e.g. `30%`. */
const segmentWidths = () => segments().map((segment) => segment.style.width);

/** The bar's segment opacities, as numbers, left to right. */
const segmentOpacities = () =>
  segments().map((segment) => Number(segment.style.opacity));

/** The bar's segment colour utilities, left to right. */
const segmentColors = () =>
  segments().map((segment) =>
    Array.from(segment.classList).find((name) => name.startsWith("bg-")),
  );

/** The bar's total drawn width, as a percentage of the track. */
const drawnWidth = () =>
  segmentWidths().reduce((sum, width) => sum + Number.parseFloat(width), 0);

describe("GoalsView", () => {
  test("starts with four default meals when no goals are stored", () => {
    render(<GoalsView goals={null} />);

    expect(mealCount()).toBe(4);
    expect(screen.getByLabelText("Calories (kcal)")).toHaveValue(2000);
    const defaults = [
      ["Breakfast", 25],
      ["Lunch", 35],
      ["Snack", 10],
      ["Dinner", 30],
    ] as const;
    defaults.forEach(([name, share], index) => {
      const position = index + 1;
      expect(screen.getByLabelText(`Meal ${position} name`)).toHaveValue(name);
      expect(screen.getByLabelText(`Meal ${position} share (%)`)).toHaveValue(
        share,
      );
    });
    expect(
      screen.getByRole("button", { name: "Set goals" }),
    ).toBeInTheDocument();
  });

  test("explains the calorie target without recommending one", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={null} />);

    await user.click(
      screen.getByRole("button", { name: "About the calorie target" }),
    );

    expect(
      await screen.findByRole("dialog", {
        name: "Choosing your calorie target",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /2000 kcal is just an example value, not a target for you/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "A dietitian or doctor can help you set the right number.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Mifflin|Harris/)).not.toBeInTheDocument();
  });

  test("explains the macro split with the WHO adult ranges", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={null} />);

    expect(screen.getByRole("group", { name: "Macros" })).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "About the macro split" }),
    );

    expect(
      await screen.findByRole("dialog", { name: "Choosing your macro split" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /starts you at 15% protein, 60% carbs and 25% fat, within WHO/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/protein 10–15%, carbs 45–75% and fat 15–30%/),
    ).toBeInTheDocument();
  });

  test("opening a help note does not submit the form", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={null} />);

    await user.click(
      screen.getByRole("button", { name: "About the calorie target" }),
    );

    expect(saveGoalsAction).not.toHaveBeenCalled();
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

  test("makes room for added meals and keeps the others' proportions", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);

    await user.click(screen.getByRole("button", { name: "Add meal" }));
    await user.click(screen.getByRole("button", { name: "Add meal" }));

    expect(mealCount()).toBe(5);
    expect(screen.getByLabelText("Meal 4 name")).toHaveValue("Meal 4");
    expect(screen.getByLabelText("Meal 5 name")).toHaveValue("Meal 5");
    expect(shares()).toEqual([18, 24, 18, 20, 20]);
  });

  test("stops at eight meals without touching the shares", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={null} />);
    const add = screen.getByRole("button", { name: "Add meal" });

    for (let count = 4; count < 8; count += 1) await user.click(add);
    expect(mealCount()).toBe(8);
    expect(add).toBeDisabled();
    expect(screen.getByText(/You can have up to 8 meals/)).toBeInTheDocument();

    const before = shares();
    await user.click(add);

    expect(shares()).toEqual(before);
  });

  test("focuses and selects a new meal's name", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);

    await user.click(screen.getByRole("button", { name: "Add meal" }));

    const name = screen.getByLabelText<HTMLInputElement>("Meal 4 name");
    expect(name).toHaveFocus();
    expect(name.selectionEnd! - name.selectionStart!).toBe(6);
  });

  test("appends a row named Meal N and keeps the shares summing to 100", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);

    await user.click(screen.getByRole("button", { name: "Add meal" }));

    expect(screen.getByLabelText("Meal 4 name")).toHaveValue("Meal 4");
    expect(shares().reduce((sum, value) => sum + value, 0)).toBeCloseTo(100);
  });

  test("keeps keys unique when adding after a middle removal", async () => {
    const user = userEvent.setup();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      render(<GoalsView goals={makeGoals()} />);

      // Removing the middle row leaves keys like row-0, row-2 — no longer
      // positional — so an append must not reuse a positional fallback key.
      await user.click(screen.getByRole("button", { name: "Remove Lunch" }));
      await user.click(screen.getByRole("button", { name: "Add meal" }));

      expect(screen.getByLabelText("Meal 1 name")).toHaveValue("Breakfast");
      expect(screen.getByLabelText("Meal 2 name")).toHaveValue("Dinner");
      expect(screen.getByLabelText("Meal 3 name")).toHaveValue("Meal 3");

      const duplicateKeyWarnings = errorSpy.mock.calls.filter((args) =>
        args.some((arg) => typeof arg === "string" && arg.includes("same key")),
      );
      expect(duplicateKeyWarnings).toEqual([]);
    } finally {
      errorSpy.mockRestore();
    }
  });

  test("removes a meal and hands its share to the others in proportion", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);

    expect(screen.getByRole("button", { name: "Remove Dinner" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Remove Dinner" }));

    expect(screen.queryByLabelText("Meal 3 name")).not.toBeInTheDocument();
    expect(shares()).toEqual([43, 57]);
  });

  test("moves focus to the next meal's name after a removal", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);

    await user.click(screen.getByRole("button", { name: "Remove Lunch" }));
    expect(screen.getByLabelText("Meal 2 name")).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Remove Dinner" }));
    expect(screen.getByLabelText("Meal 1 name")).toHaveFocus();
  });

  test("removes the middle meal, not the last one", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);

    await user.click(screen.getByRole("button", { name: "Remove Lunch" }));

    expect(screen.queryByLabelText("Meal 3 name")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Meal 1 name")).toHaveValue("Breakfast");
    expect(screen.getByLabelText("Meal 2 name")).toHaveValue("Dinner");
    expect(shares()).toEqual([50, 50]);
    expect(screen.getByText("Lunch removed")).toBeInTheDocument();
  });

  test("removes the visible row after reordering, carrying its slot id", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);

    // Move Dinner (slot 3) into the middle before removing that position.
    await user.click(screen.getByRole("button", { name: "Move Dinner up" }));
    await user.click(screen.getByRole("button", { name: "Remove Dinner" }));

    expect(screen.getByLabelText("Meal 1 name")).toHaveValue("Breakfast");
    expect(screen.getByLabelText("Meal 2 name")).toHaveValue("Lunch");
    // The removed row was Dinner, so its slot id is the one no longer posted.
    const slotIds = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        'input[type="hidden"][name="slotId"]',
      ),
    ).map((input) => input.value);
    expect(slotIds).toEqual(["meal-slot-1", "meal-slot-2"]);
  });

  test("disables removal once only one meal remains", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);

    await user.click(screen.getByRole("button", { name: "Remove Dinner" }));
    await user.click(screen.getByRole("button", { name: "Remove Lunch" }));

    expect(
      screen.getByRole("button", { name: "Remove Breakfast" }),
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

  test("updates the summary as the calorie target changes", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={null} />);

    // 2000 kcal at 60% carbs → 300 g.
    expect(screen.getByText("300")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Calories (kcal)"));
    await user.type(screen.getByLabelText("Calories (kcal)"), "2500");

    // 2500 × 25% fat / 9 = 69.4 g, shown as a whole number.
    expect(screen.getByText("69")).toBeInTheDocument();
    expect(screen.getByText("2500")).toBeInTheDocument();
  });

  test("moves a meal up and carries its name and share with it", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);

    await user.click(screen.getByRole("button", { name: "Move Lunch up" }));

    // Lunch swaps into first place, taking its 40% share along.
    expect(screen.getByLabelText("Meal 1 name")).toHaveValue("Lunch");
    expect(screen.getByLabelText("Meal 1 share (%)")).toHaveValue(40);
    expect(screen.getByLabelText("Meal 2 name")).toHaveValue("Breakfast");
    expect(screen.getByLabelText("Meal 2 share (%)")).toHaveValue(30);
  });

  test("moves a meal down and keeps the live summary in step", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);

    expect(summaryMeals()).toEqual(["Breakfast", "Lunch", "Dinner"]);

    await user.click(
      screen.getByRole("button", { name: "Move Breakfast down" }),
    );

    expect(screen.getByLabelText("Meal 1 name")).toHaveValue("Lunch");
    expect(screen.getByLabelText("Meal 2 name")).toHaveValue("Breakfast");
    expect(summaryMeals()).toEqual(["Lunch", "Breakfast", "Dinner"]);
  });

  test("disables the move buttons at the ends of the list", () => {
    render(<GoalsView goals={null} />);

    expect(
      screen.getByRole("button", { name: "Move Breakfast up" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Move Dinner down" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Move Breakfast down" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Move Dinner up" }),
    ).toBeEnabled();
  });

  test("opts the row action buttons out of Firefox's button-state restore", () => {
    render(<GoalsView goals={makeGoals()} />);

    // Firefox persists a button's dynamic `disabled` state across reloads; a
    // reload after an unsaved edit (e.g. adding a meal) can restore a state
    // that disagrees with the server HTML. `autocomplete="off"` opts out.
    for (const name of [
      "Move Breakfast up",
      "Move Breakfast down",
      "Remove Breakfast",
      "Move Dinner down",
    ]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute(
        "autocomplete",
        "off",
      );
    }
  });

  test("announces the new position after a move", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={null} />);

    await user.click(screen.getByRole("button", { name: "Move Lunch up" }));

    expect(screen.getByText("Lunch moved to position 1")).toBeInTheDocument();
  });

  test("keeps keyboard focus on a moving row, even at the end of the list", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={null} />);

    // Lunch reaches the top, so "Move up" disables and "Move down" takes focus.
    await user.click(screen.getByRole("button", { name: "Move Lunch up" }));
    expect(
      screen.getByRole("button", { name: "Move Lunch down" }),
    ).toHaveFocus();

    // In the middle of the list, the arrow that was used keeps it.
    await user.click(screen.getByRole("button", { name: "Move Lunch down" }));
    expect(screen.getByRole("button", { name: "Move Lunch up" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Move Lunch down" }),
    ).toHaveFocus();
  });

  test("offers the row actions in a menu that names the meal", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);

    await user.click(screen.getByRole("button", { name: "Actions for Lunch" }));
    await user.click(await screen.findByRole("menuitem", { name: "Remove" }));

    expect(screen.getByLabelText("Meal 2 name")).toHaveValue("Dinner");
    expect(shares()).toEqual([50, 50]);
  });

  test("moves a meal up and down from the row menu", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);

    await user.click(screen.getByRole("button", { name: "Actions for Lunch" }));
    await user.click(await screen.findByRole("menuitem", { name: "Move up" }));

    expect(screen.getByLabelText("Meal 1 name")).toHaveValue("Lunch");
    expect(screen.getByLabelText("Meal 2 name")).toHaveValue("Breakfast");

    await user.click(screen.getByRole("button", { name: "Actions for Lunch" }));
    await user.click(
      await screen.findByRole("menuitem", { name: "Move down" }),
    );

    expect(screen.getByLabelText("Meal 1 name")).toHaveValue("Breakfast");
    expect(screen.getByLabelText("Meal 2 name")).toHaveValue("Lunch");
  });

  test("splits the day evenly on request", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);
    const split = screen.getByRole("button", { name: "Split evenly" });

    await user.click(split);

    expect(shares()).toEqual([34, 33, 33]);
    expect(split).toBeDisabled();
    expect(screen.getByText("Meals split evenly")).toBeInTheDocument();
  });

  test("offers no even split for a single meal", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);

    await user.click(screen.getByRole("button", { name: "Remove Dinner" }));
    await user.click(screen.getByRole("button", { name: "Remove Lunch" }));

    expect(
      screen.queryByRole("button", { name: "Split evenly" }),
    ).not.toBeInTheDocument();
  });

  describe("draggable bars", () => {
    /** The drag hints, in page order: the macro bar's, then the meal bar's. */
    const hints = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-slot="split-slider-hint"]',
        ),
      );

    test("tells the user the macro and meal bars can be dragged", () => {
      render(<GoalsView goals={null} />);

      expect(hints()).toHaveLength(2);
      for (const hint of hints()) {
        expect(hint).toHaveTextContent(
          "Drag the circles on the bar to change the split.",
        );
        expect(hint).not.toHaveClass("invisible");
      }
    });

    test("hides a bar's hint but keeps its space while the total does not add up", async () => {
      const user = userEvent.setup();
      render(<GoalsView goals={null} />);

      await user.clear(screen.getByLabelText("Meal 1 share (%)"));
      await user.type(screen.getByLabelText("Meal 1 share (%)"), "10");

      const [macroHint, mealHint] = hints();
      expect(macroHint).not.toHaveClass("invisible");
      expect(mealHint).toHaveClass("invisible");
    });

    test("offers no meal hint for a single meal, which has nothing to drag", async () => {
      const user = userEvent.setup();
      render(<GoalsView goals={makeGoals()} />);

      await user.click(screen.getByRole("button", { name: "Remove Dinner" }));
      await user.click(screen.getByRole("button", { name: "Remove Lunch" }));

      expect(hints()).toHaveLength(1);
    });

    test("moves a meal divider with the arrow keys, trading between neighbours", () => {
      render(<GoalsView goals={makeGoals()} />);

      fireEvent.keyDown(
        screen.getByRole("slider", {
          name: "Divider between Breakfast and Lunch",
        }),
        { key: "ArrowRight" },
      );

      expect(shares()).toEqual([31, 39, 30]);
      expect(screen.getByText("Meals total 100%")).toBeInTheDocument();
    });

    test("leaves the shares alone when a divider is already at the edge", async () => {
      const user = userEvent.setup();
      render(<GoalsView goals={makeGoals()} />);
      await user.clear(screen.getByLabelText("Meal 1 share (%)"));
      await user.type(screen.getByLabelText("Meal 1 share (%)"), "0");
      await user.clear(screen.getByLabelText("Meal 2 share (%)"));
      await user.type(screen.getByLabelText("Meal 2 share (%)"), "70");

      fireEvent.keyDown(
        screen.getByRole("slider", {
          name: "Divider between Breakfast and Lunch",
        }),
        { key: "ArrowLeft" },
      );

      expect(shares()).toEqual([0, 70, 30]);
    });

    test("moves a macro divider", () => {
      render(<GoalsView goals={null} />);

      fireEvent.keyDown(
        screen.getByRole("slider", { name: "Divider between Carbs and Fat" }),
        { key: "ArrowLeft" },
      );

      expect(screen.getByLabelText("Carbs %")).toHaveValue(59);
      expect(screen.getByLabelText("Fat %")).toHaveValue(26);
      expect(screen.getByLabelText("Protein %")).toHaveValue(15);
    });

    test("describes both neighbours to screen readers", () => {
      render(<GoalsView goals={null} />);

      expect(
        screen.getByRole("slider", {
          name: "Divider between Protein and Carbs",
        }),
      ).toHaveAttribute("aria-valuetext", "Protein 15%, Carbs 60%");
    });

    test("removes the thumbs while the total does not add up", async () => {
      const user = userEvent.setup();
      render(<GoalsView goals={null} />);

      await user.clear(screen.getByLabelText("Meal 1 share (%)"));
      await user.type(screen.getByLabelText("Meal 1 share (%)"), "10");

      expect(
        screen.queryByRole("slider", {
          name: "Divider between Breakfast and Lunch",
        }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("slider", {
          name: "Divider between Protein and Carbs",
        }),
      ).toBeInTheDocument();
    });

    test("does not submit the sliders with the form", () => {
      render(<GoalsView goals={makeGoals()} />);

      const form = document.querySelector("form") as HTMLFormElement;
      expect([...new FormData(form).keys()].sort()).toEqual([
        "calories",
        "carbsPct",
        "fatPct",
        "proteinPct",
        "slotId",
        "slotId",
        "slotId",
        "slotName",
        "slotName",
        "slotName",
        "slotPercent",
        "slotPercent",
        "slotPercent",
      ]);
    });
  });

  test("toasts the saved message once a save succeeds", async () => {
    const user = userEvent.setup();
    action.mockImplementation(async () => ({
      status: "success",
      resetKey: 1,
      savedMessage: "Goals saved.",
    }));

    render(<GoalsView goals={makeGoals()} />);
    await user.type(screen.getByLabelText("Calories (kcal)"), "5");
    await user.click(screen.getByRole("button", { name: "Save goals" }));

    await waitFor(() => expect(toast.add).toHaveBeenCalledTimes(1));
    expect(toast.add).toHaveBeenCalledWith({
      type: "success",
      title: "Goals saved.",
    });
    // The live region keeps the same message for screen readers.
    expect(screen.getByText("Goals saved.")).toBeInTheDocument();
  });

  test("falls back to a default toast when the save returns no message", async () => {
    const user = userEvent.setup();
    action.mockImplementation(async () => ({
      status: "success",
      resetKey: 1,
    }));

    render(<GoalsView goals={makeGoals()} />);
    await user.type(screen.getByLabelText("Calories (kcal)"), "5");
    await user.click(screen.getByRole("button", { name: "Save goals" }));

    await waitFor(() =>
      expect(toast.add).toHaveBeenCalledWith({
        type: "success",
        title: "Goals saved.",
      }),
    );
  });

  test("treats an empty macro field as 0%", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={null} />);

    // 2000 kcal at 60% carbs → 300 g, until the field is emptied.
    expect(screen.getByText("300")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Carbs %"));

    expect(screen.queryByText("300")).not.toBeInTheDocument();
    expect(
      screen.getByText("Macros total 40% — add 60% to reach 100%"),
    ).toBeInTheDocument();
  });

  test("shows a failed save inline, without a success toast", async () => {
    const user = userEvent.setup();
    action.mockImplementation(async () => ({
      status: "error",
      resetKey: 0,
      formError: "The goals could not be saved. Please try again.",
    }));

    render(<GoalsView goals={makeGoals()} />);
    await user.type(screen.getByLabelText("Calories (kcal)"), "5");
    await user.click(screen.getByRole("button", { name: "Save goals" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The goals could not be saved. Please try again.",
    );
    expect(toast.add).not.toHaveBeenCalled();
  });

  describe("errors from a failed save", () => {
    /** Fails the next save with the given per-field errors. */
    const failWith = (
      fieldErrors: Record<string, string[]>,
      formError?: string,
    ) =>
      action.mockImplementation(async () => ({
        status: "error",
        resetKey: 0,
        fieldErrors,
        formError,
      }));

    test("clear a field's error as soon as it is edited", async () => {
      const user = userEvent.setup();
      failWith({ calories: ["Calories cannot be more than 10000"] });
      render(<GoalsView goals={null} />);

      await user.click(screen.getByRole("button", { name: "Set goals" }));
      await screen.findByText("Calories cannot be more than 10000");

      await user.type(screen.getByLabelText("Calories (kcal)"), "0");

      expect(
        screen.queryByText("Calories cannot be more than 10000"),
      ).not.toBeInTheDocument();
    });

    test("stay on their meal when the rows are reordered", async () => {
      const user = userEvent.setup();
      failWith({ "slots.0.name": ["Name is required"] });
      render(<GoalsView goals={null} />);

      await user.click(screen.getByRole("button", { name: "Set goals" }));
      const message = await screen.findByText("Name is required");
      expect(message.closest('[data-slot="meal-row"]')).toContainElement(
        screen.getByLabelText("Meal 1 name"),
      );

      await user.click(
        screen.getByRole("button", { name: "Move Breakfast down" }),
      );

      // Breakfast is now the second row, and its error went with it.
      expect(
        screen.getByText("Name is required").closest('[data-slot="meal-row"]'),
      ).toContainElement(screen.getByLabelText("Meal 2 name"));
    });

    test("mark a macro field invalid and point it at its message", async () => {
      const user = userEvent.setup();
      failWith({ proteinPct: ["Protein must be between 0 and 100"] });
      render(<GoalsView goals={null} />);

      await user.click(screen.getByRole("button", { name: "Set goals" }));
      const message = await screen.findByText(
        "Protein must be between 0 and 100",
      );

      const protein = screen.getByLabelText("Protein %");
      expect(protein).toHaveAttribute("aria-invalid", "true");
      expect(protein).toHaveAttribute(
        "aria-describedby",
        message.closest("[id]")?.id,
      );
      // The other macros keep their clean state.
      expect(screen.getByLabelText("Carbs %")).not.toHaveAttribute(
        "aria-invalid",
      );
    });

    test("mark a meal's share invalid and point it at its message", async () => {
      const user = userEvent.setup();
      failWith({ "slots.0.percent": ["Share must be at least 1"] });
      render(<GoalsView goals={null} />);

      await user.click(screen.getByRole("button", { name: "Set goals" }));
      const message = await screen.findByText("Share must be at least 1");

      const share = screen.getByLabelText("Meal 1 share (%)");
      expect(share).toHaveAttribute("aria-invalid", "true");
      expect(share).toHaveAttribute(
        "aria-describedby",
        message.closest("[id]")?.id,
      );
      expect(screen.getByLabelText("Meal 2 share (%)")).not.toHaveAttribute(
        "aria-invalid",
      );
    });

    test("show an error about the meals as a whole under the list", async () => {
      const user = userEvent.setup();
      failWith({ slots: ["Add at least one meal"] });
      render(<GoalsView goals={null} />);

      await user.click(screen.getByRole("button", { name: "Set goals" }));

      expect(
        await screen.findByText("Add at least one meal"),
      ).toBeInTheDocument();
    });

    test("clear a form-level error on any edit", async () => {
      const user = userEvent.setup();
      failWith({}, "The goals could not be saved. Please try again.");
      render(<GoalsView goals={null} />);

      await user.click(screen.getByRole("button", { name: "Set goals" }));
      await screen.findByRole("alert");

      await user.type(screen.getByLabelText("Calories (kcal)"), "0");

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  test("divides the day into one bar segment per meal, in dining order", () => {
    render(<GoalsView goals={makeGoals()} />);

    // The stored goals are Breakfast 30, Lunch 40, Dinner 30.
    expect(segmentWidths()).toEqual(["30%", "40%", "30%"]);
  });

  test("paints the meals with the meal tokens, in dining order", () => {
    render(<GoalsView goals={makeGoals()} />);

    expect(segmentColors()).toEqual(["bg-meal-1", "bg-meal-2", "bg-meal-3"]);
  });

  test("marks each meal row with its own segment's colour", () => {
    render(<GoalsView goals={makeGoals()} />);

    const swatches = Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="day-split-swatch"]'),
    );

    expect(swatches).toHaveLength(3);
    swatches.forEach((swatch, index) => {
      expect(swatch).toHaveClass(`bg-meal-${index + 1}`);
    });
  });

  test("redraws the bar as a share is edited", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);

    await user.clear(screen.getByLabelText("Meal 3 share (%)"));
    await user.type(screen.getByLabelText("Meal 3 share (%)"), "10");

    // Breakfast's 30 now looks three times Dinner's 10.
    expect(segmentWidths()).toEqual(["30%", "40%", "10%"]);
  });

  test("leaves the unclaimed stretch of the track empty while the shares fall short", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);

    await user.clear(screen.getByLabelText("Meal 1 share (%)"));
    await user.type(screen.getByLabelText("Meal 1 share (%)"), "10");

    // 10 + 40 + 30 = 80, so a fifth of the track stays bare — the same gap the
    // save-time sum check rejects.
    expect(segmentWidths()).toEqual(["10%", "40%", "30%"]);
    expect(drawnWidth()).toBeCloseTo(80);
  });

  test("scales the whole bar back when the shares exceed 100", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);

    await user.clear(screen.getByLabelText("Meal 1 share (%)"));
    await user.type(screen.getByLabelText("Meal 1 share (%)"), "80");

    // 80 + 40 + 30 = 150, so Breakfast draws 80/150 of the track.
    expect(drawnWidth()).toBeCloseTo(100);
    expect(Number.parseFloat(segmentWidths()[0])).toBeCloseTo(53.3333333);
  });

  test("repaints the bar in the new order after a meal is moved", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);

    await user.click(screen.getByRole("button", { name: "Move Lunch down" }));

    // Lunch's 40% takes the last place, so it also takes that place's colour.
    expect(summaryMeals()).toEqual(["Breakfast", "Dinner", "Lunch"]);
    expect(segmentWidths()).toEqual(["30%", "30%", "40%"]);
    expect(segmentColors()).toEqual(["bg-meal-1", "bg-meal-2", "bg-meal-3"]);
  });

  test("gives every meal its own tint past the four meal tokens", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);

    await user.click(screen.getByRole("button", { name: "Add meal" }));
    await user.click(screen.getByRole("button", { name: "Add meal" }));

    expect(segmentWidths()).toEqual(["18%", "24%", "18%", "20%", "20%"]);
    expect(new Set(segmentOpacities()).size).toBe(5);
    expect(segmentOpacities()[4]).toBe(1);
  });

  test("keeps the bar but hides per-meal numbers without a calorie target", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);

    await user.clear(screen.getByLabelText("Calories (kcal)"));

    expect(segments()).toHaveLength(3);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText(/600\s*kcal/)).not.toBeInTheDocument();
    expect(
      screen.getByText("Enter a calorie target to see the numbers."),
    ).toBeInTheDocument();
  });

  test("shows each meal's calories on its row", () => {
    render(<GoalsView goals={makeGoals()} />);

    const row = screen
      .getByLabelText("Meal 2 name")
      .closest<HTMLElement>('[data-slot="meal-row"]');

    expect(within(row!).getByText(/800\s*kcal/)).toBeInTheDocument();
  });

  test("lists each meal's slice as aligned table columns", () => {
    render(<GoalsView goals={makeGoals()} />);

    const cells = within(summaryRows()[1])
      .getAllByRole("cell")
      .map((cell) => cell.textContent);

    expect(cells).toEqual(["Lunch", "800", "60", "80", "27"]);
    expect(
      screen.getByRole("columnheader", { name: "Protein" }),
    ).toBeInTheDocument();
  });

  test("uses the clamped share for a meal's numbers, as the bar does", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={null} />);

    await user.clear(screen.getByLabelText("Meal 1 share (%)"));
    await user.type(screen.getByLabelText("Meal 1 share (%)"), "150");

    // 150% draws as 100% of the day, so it must also read as 2000 kcal.
    expect(within(summaryRows()[0]).getAllByRole("cell")[1]).toHaveTextContent(
      "2000",
    );
  });

  test("marks 100% on an over-allocated bar", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);
    const limit = () =>
      document.querySelector<HTMLElement>('[data-slot="day-split-bar-limit"]');

    expect(limit()).toBeNull();

    await user.clear(screen.getByLabelText("Meal 1 share (%)"));
    await user.type(screen.getByLabelText("Meal 1 share (%)"), "55");

    // 55 + 40 + 30 = 125, so 100% sits 80% of the way along the track.
    expect(limit()?.style.left).toBe("80%");
  });

  test("keeps whole percentages when a rescale does not divide evenly", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);

    await user.click(screen.getByRole("button", { name: "Remove Dinner" }));
    await user.click(screen.getByRole("button", { name: "Add meal" }));

    expect(shares()).toEqual([29, 38, 33]);
  });

  test("names each row action after the meal, falling back when it is blank", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={null} />);

    await user.clear(screen.getByLabelText("Meal 2 name"));

    expect(
      screen.getByRole("button", { name: "Move Meal 2 up" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Breakfast" }),
    ).toBeInTheDocument();
  });

  test("states a valid macro and meal total", () => {
    render(<GoalsView goals={null} />);

    expect(screen.getByText("Macros total 100%")).toBeInTheDocument();
    expect(screen.getByText("Meals total 100%")).toBeInTheDocument();
  });

  test("says how to fix a macro total that falls short", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={null} />);

    await user.clear(screen.getByLabelText("Protein %"));
    await user.type(screen.getByLabelText("Protein %"), "10");

    expect(
      screen.getByText("Macros total 95% — add 5% to reach 100%"),
    ).toBeInTheDocument();
  });

  test("says how to fix a meal total that runs over", async () => {
    const user = userEvent.setup();
    render(<GoalsView goals={makeGoals()} />);

    await user.clear(screen.getByLabelText("Meal 1 share (%)"));
    await user.type(screen.getByLabelText("Meal 1 share (%)"), "40");

    expect(
      screen.getByText("Meals total 110% — remove 10% to reach 100%"),
    ).toBeInTheDocument();
  });

  test("marks the Add meal plus with the brand accent", () => {
    render(<GoalsView goals={null} />);

    expect(
      screen.getByRole("button", { name: "Add meal" }).querySelector("svg"),
    ).toHaveClass("text-brand");
  });

  describe("action bar", () => {
    const bar = () =>
      document.querySelector<HTMLElement>('[data-slot="goals-action-bar"]');
    const reset = () => screen.getByRole("button", { name: "Reset" });
    const save = () => screen.getByRole("button", { name: "Save goals" });

    test("stays in view with nothing to discard on saved goals", () => {
      render(<GoalsView goals={makeGoals()} />);

      expect(screen.getByText("All changes saved")).toBeInTheDocument();
      expect(reset()).toBeDisabled();
      expect(save()).toBeDisabled();
      expect(bar()).toHaveClass("sticky", "bottom-0");
    });

    test("lets a first-time visitor save the untouched defaults", () => {
      render(<GoalsView goals={null} />);

      expect(screen.getByRole("button", { name: "Set goals" })).toBeEnabled();
    });

    test("enables saving once a field changes", async () => {
      const user = userEvent.setup();
      render(<GoalsView goals={makeGoals()} />);

      await user.type(screen.getByLabelText("Calories (kcal)"), "5");

      expect(save()).toBeEnabled();
    });

    test("names a broken total and stops the save at the first problem", async () => {
      const user = userEvent.setup();
      render(<GoalsView goals={makeGoals()} />);

      await user.clear(screen.getByLabelText("Fat %"));
      await user.type(screen.getByLabelText("Fat %"), "20");
      expect(
        screen.getByText("Fix the macro total to save"),
      ).toBeInTheDocument();

      await user.click(save());

      expect(action).not.toHaveBeenCalled();
      expect(screen.getByLabelText("Protein %")).toHaveFocus();
    });

    test("takes a broken meal total to the first share", async () => {
      const user = userEvent.setup();
      render(<GoalsView goals={makeGoals()} />);

      await user.clear(screen.getByLabelText("Meal 3 share (%)"));
      await user.type(screen.getByLabelText("Meal 3 share (%)"), "20");
      expect(
        screen.getByText("Fix the meal total to save"),
      ).toBeInTheDocument();

      await user.click(save());

      expect(action).not.toHaveBeenCalled();
      expect(screen.getByLabelText("Meal 1 share (%)")).toHaveFocus();
    });

    test("tells a first-time visitor the defaults are not saved", () => {
      render(<GoalsView goals={null} />);

      expect(screen.getByText("Not saved yet")).toBeInTheDocument();
      expect(reset()).toBeDisabled();
      expect(bar()).toHaveClass("sticky", "bottom-0");
    });

    test("shows the unsaved dot once a field changes", async () => {
      const user = userEvent.setup();
      render(<GoalsView goals={makeGoals()} />);

      await user.type(screen.getByLabelText("Calories (kcal)"), "5");

      expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
      expect(bar()).toHaveClass("sticky");
      expect(document.querySelector('[data-slot="unsaved-dot"]')).toHaveClass(
        "bg-brand",
      );
      expect(reset()).toBeEnabled();
    });

    test("counts a reorder as an edit, and undoing it as clean", async () => {
      const user = userEvent.setup();
      render(<GoalsView goals={makeGoals()} />);

      await user.click(screen.getByRole("button", { name: "Move Lunch up" }));
      expect(screen.getByText("Unsaved changes")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Move Lunch down" }));
      expect(screen.getByText("All changes saved")).toBeInTheDocument();
    });

    test("reset restores every field and row, and moves focus to the first field", async () => {
      const user = userEvent.setup();
      render(<GoalsView goals={makeGoals()} />);

      await user.clear(screen.getByLabelText("Calories (kcal)"));
      await user.type(screen.getByLabelText("Calories (kcal)"), "1500");
      await user.clear(screen.getByLabelText("Protein %"));
      await user.click(screen.getByRole("button", { name: "Remove Lunch" }));
      await user.click(reset());

      expect(screen.getByLabelText("Calories (kcal)")).toHaveValue(2000);
      expect(screen.getByLabelText("Protein %")).toHaveValue(30);
      expect(screen.getByLabelText("Meal 2 name")).toHaveValue("Lunch");
      expect(shares()).toEqual([30, 40, 30]);
      expect(screen.getByText("All changes saved")).toBeInTheDocument();
      expect(screen.getByText("Changes discarded")).toBeInTheDocument();
      expect(screen.getByLabelText("Calories (kcal)")).toHaveFocus();
    });

    test("reset clears the errors of a failed save", async () => {
      const user = userEvent.setup();
      action.mockImplementation(async () => ({
        status: "error",
        resetKey: 0,
        formError: "The goals could not be saved. Please try again.",
      }));

      render(<GoalsView goals={makeGoals()} />);
      await user.type(screen.getByLabelText("Calories (kcal)"), "5");
      await user.click(screen.getByRole("button", { name: "Save goals" }));
      await screen.findByRole("alert");

      await user.click(reset());

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("removing a stored meal", () => {
    const remove = (user: ReturnType<typeof userEvent.setup>) =>
      user.click(screen.getByRole("button", { name: "Remove Lunch" }));

    test("warns about upcoming plans before saving", async () => {
      const user = userEvent.setup();
      render(
        <GoalsView
          goals={makeGoals()}
          slotUsage={{
            "meal-slot-2": {
              upcomingDays: ["2026-10-13"],
              hasPastPlans: false,
            },
          }}
        />,
      );

      expect(screen.queryByText(/has planned meals/)).not.toBeInTheDocument();

      await remove(user);

      expect(
        screen.getByText(/Lunch has planned meals on Tue 13/),
      ).toBeInTheDocument();
    });

    test("warns that past plans go with it", async () => {
      const user = userEvent.setup();
      render(
        <GoalsView
          goals={makeGoals()}
          slotUsage={{
            "meal-slot-2": { upcomingDays: [], hasPastPlans: true },
          }}
        />,
      );

      await remove(user);

      expect(
        screen.getByText("Saving also deletes the past plans for Lunch."),
      ).toBeInTheDocument();
    });

    test("stays quiet for a meal with no plans", async () => {
      const user = userEvent.setup();
      render(<GoalsView goals={makeGoals()} />);

      await remove(user);

      expect(screen.queryByText(/plans/)).not.toBeInTheDocument();
    });
  });

  describe("leaving with unsaved edits", () => {
    const renderWithLink = () =>
      render(
        <>
          <a href="/meals">Meals</a>
          <GoalsView goals={makeGoals()} />
        </>,
      );

    test("asks first, and stays when told to keep editing", async () => {
      const user = userEvent.setup();
      renderWithLink();

      await user.type(screen.getByLabelText("Calories (kcal)"), "5");
      await user.click(screen.getByRole("link", { name: "Meals" }));

      expect(
        await screen.findByRole("alertdialog", {
          name: "Discard unsaved changes?",
        }),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Keep editing" }));

      expect(push).not.toHaveBeenCalled();
      expect(screen.getByLabelText("Calories (kcal)")).toHaveValue(20005);
    });

    test("follows the link once the edits are discarded", async () => {
      const user = userEvent.setup();
      renderWithLink();

      await user.type(screen.getByLabelText("Calories (kcal)"), "5");
      await user.click(screen.getByRole("link", { name: "Meals" }));
      await user.click(
        await screen.findByRole("button", { name: "Discard changes" }),
      );

      expect(push).toHaveBeenCalledWith("/meals");
    });

    test("does not ask when there is nothing to lose", async () => {
      const user = userEvent.setup();
      renderWithLink();

      await user.click(screen.getByRole("link", { name: "Meals" }));

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });

    test("raises the browser's prompt only while dirty", async () => {
      const user = userEvent.setup();
      renderWithLink();
      const unload = () => {
        const event = new Event("beforeunload", { cancelable: true });
        window.dispatchEvent(event);
        return event.defaultPrevented;
      };

      expect(unload()).toBe(false);

      await user.type(screen.getByLabelText("Calories (kcal)"), "5");

      expect(unload()).toBe(true);
    });
  });

  test("clips a long meal name in the summary", async () => {
    const user = userEvent.setup();
    const longName = "a".repeat(60);
    render(<GoalsView goals={null} />);

    await user.clear(screen.getByLabelText("Meal 1 name"));
    await user.type(screen.getByLabelText("Meal 1 name"), longName);

    const name = within(summaryRows()[0]).getByText(longName);

    expect(name).toHaveClass("truncate");
    expect(name).toHaveAttribute("title", longName);
    // A fixed table layout stops the cell from growing with its content.
    expect(screen.getByRole("table")).toHaveClass("table-fixed");
  });
});
