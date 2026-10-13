import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { MacroChips } from "@/components/calendar/macro-chips";
import type { SlotBudget } from "@/lib/goals/budget";
import type { MealTotals } from "@/lib/meals/macros";

/** A slot target of 60 g protein, 60 g carbs and 20 g fat. */
const target: SlotBudget = {
  calories: 700,
  proteinGrams: 60,
  carbsGrams: 60,
  fatGrams: 20,
};

/** Totals with only the fields a test cares about set. */
function totals(overrides: Partial<MealTotals> = {}): MealTotals {
  return { calories: 0, protein: 0, carbs: 0, fat: 0, ...overrides };
}

describe("MacroChips", () => {
  test("reports each macro's planned amount against its target", () => {
    render(
      <MacroChips
        totals={totals({ protein: 30, carbs: 40, fat: 10 })}
        target={target}
      />,
    );

    expect(
      screen.getByRole("listitem", { name: /Protein: 30 of 60 g/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", { name: /Carbs: 40 of 60 g/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("listitem", { name: /Fat: 10 of 20 g/ }),
    ).toBeInTheDocument();
  });

  test("marks a met macro with a tick", () => {
    render(<MacroChips totals={totals({ protein: 60 })} target={target} />);

    const chip = screen.getByRole("listitem", {
      name: /Protein: 60 of 60 g, on target/,
    });

    expect(chip).toHaveTextContent("✓");
  });

  test("marks a short macro with the signed gap", () => {
    render(<MacroChips totals={totals({ carbs: 46.8 })} target={target} />);

    const chip = screen.getByRole("listitem", {
      name: /Carbs: 46.8 of 60 g, 13.2 g short/,
    });

    expect(chip).toHaveTextContent("−13.2");
  });

  test("marks an over macro with the signed gap", () => {
    render(<MacroChips totals={totals({ fat: 25 })} target={target} />);

    const chip = screen.getByRole("listitem", {
      name: /Fat: 25 of 20 g, 5 g over/,
    });

    expect(chip).toHaveTextContent("+5");
  });

  test("treats an empty plan against a zero target as met", () => {
    render(
      <MacroChips
        totals={totals()}
        target={{
          calories: 0,
          proteinGrams: 0,
          carbsGrams: 0,
          fatGrams: 0,
        }}
      />,
    );

    const chips = screen.getAllByRole("listitem");

    expect(chips).toHaveLength(3);
    for (const chip of chips) {
      expect(chip).toHaveTextContent("✓");
    }
  });

  test("flags any plan against a zero target as over", () => {
    render(
      <MacroChips
        totals={totals({ protein: 1 })}
        target={{
          calories: 0,
          proteinGrams: 0,
          carbsGrams: 0,
          fatGrams: 0,
        }}
      />,
    );

    expect(
      screen.getByRole("listitem", { name: /Protein: 1 of 0 g, 1 g over/ }),
    ).toHaveTextContent("+1");
  });
});
