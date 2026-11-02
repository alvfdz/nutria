import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { MacroBars } from "@/components/macro-bars";
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

describe("MacroBars", () => {
  test("reports each macro's planned amount against its target", () => {
    render(
      <MacroBars
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
    render(<MacroBars totals={totals({ protein: 60 })} target={target} />);

    const bar = screen.getByRole("listitem", {
      name: "Protein: 60 of 60 g, on target",
    });

    expect(bar).toHaveTextContent("✓");
  });

  test("marks a short macro with the signed gap", () => {
    render(<MacroBars totals={totals({ carbs: 46.8 })} target={target} />);

    const bar = screen.getByRole("listitem", {
      name: "Carbs: 47 of 60 g, 13 g short",
    });

    expect(bar).toHaveTextContent("−13");
  });

  test("marks an over macro with the signed gap", () => {
    render(<MacroBars totals={totals({ fat: 25 })} target={target} />);

    const bar = screen.getByRole("listitem", {
      name: "Fat: 25 of 20 g, 5 g over",
    });

    expect(bar).toHaveTextContent("+5");
  });

  test("gives each bar the full state sentence as its accessible name", () => {
    render(<MacroBars totals={totals({ protein: 45 })} target={target} />);

    expect(
      screen.getByRole("listitem", {
        name: "Protein: 45 of 60 g, 15 g short",
      }),
    ).toBeInTheDocument();
  });

  test("fills the whole track when the plan is over", () => {
    render(<MacroBars totals={totals({ fat: 25 })} target={target} />);

    const bar = screen.getByRole("listitem", {
      name: "Fat: 25 of 20 g, 5 g over",
    });
    const fill = bar.querySelector('[data-slot="macro-bar-fill"]');

    expect(fill).toHaveStyle({ width: "100%" });
  });

  test("fills each bar in its macro's colour", () => {
    render(
      <MacroBars
        totals={totals({ protein: 30, carbs: 30, fat: 10 })}
        target={target}
      />,
    );

    const fills = document.querySelectorAll('[data-slot="macro-bar-fill"]');

    expect(fills[0]).toHaveClass("bg-protein");
    expect(fills[1]).toHaveClass("bg-carbs");
    expect(fills[2]).toHaveClass("bg-fat");
  });

  test("marks only an on-target macro in the brand colour", () => {
    render(
      <MacroBars totals={totals({ protein: 60, carbs: 10 })} target={target} />,
    );

    expect(screen.getByText("✓")).toHaveClass("text-brand");
    expect(screen.getByText("−50")).toHaveClass("text-muted-foreground");
  });

  test("draws no target tick in any state", () => {
    render(
      <MacroBars
        totals={totals({ protein: 30, carbs: 46.8, fat: 25 })}
        target={target}
      />,
    );

    expect(
      document.querySelectorAll('[data-slot="macro-bar-tick"]'),
    ).toHaveLength(0);
  });

  test("treats an empty plan against a zero target as met", () => {
    render(
      <MacroBars
        totals={totals()}
        target={{
          calories: 0,
          proteinGrams: 0,
          carbsGrams: 0,
          fatGrams: 0,
        }}
      />,
    );

    const bars = screen.getAllByRole("listitem");

    expect(bars).toHaveLength(3);
    for (const bar of bars) {
      expect(within(bar).getByText("✓")).toBeInTheDocument();
    }
  });
});
