import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { MacroBar, MacroDot, mealTint } from "@/components/segmented-bar";

/** The macro bar's segments, left to right. */
const segments = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>('[data-slot="macro-bar-segment"]'),
  );

/** The muted stretch left over after the segments, if any. */
const remainder = () =>
  document.querySelector<HTMLElement>('[data-slot="macro-bar-remainder"]');

describe("MacroBar", () => {
  test("marks 100% only when the total runs over", () => {
    const limit = () =>
      document.querySelector<HTMLElement>('[data-slot="macro-bar-limit"]');

    const { rerender } = render(
      <MacroBar proteinPct={30} carbsPct={40} fatPct={30} />,
    );
    expect(limit()).toBeNull();

    rerender(<MacroBar proteinPct={50} carbsPct={40} fatPct={35} />);
    expect(limit()?.style.left).toBe("80%");
  });

  test("draws protein, carbs and fat in that order, at their shares", () => {
    render(<MacroBar proteinPct={30} carbsPct={40} fatPct={30} />);

    const [protein, carbs, fat] = segments();
    expect(protein).toHaveClass("bg-protein");
    expect(protein.style.width).toBe("30%");
    expect(carbs).toHaveClass("bg-carbs");
    expect(carbs.style.width).toBe("40%");
    expect(fat).toHaveClass("bg-fat");
    expect(fat.style.width).toBe("30%");
    expect(remainder()).toBeNull();
  });

  test("shows a total short of 100 as a muted remainder", () => {
    render(<MacroBar proteinPct={30} carbsPct={40} fatPct={25} />);

    expect(remainder()?.style.width).toBe("5%");
  });

  test("scales a total above 100 back into the bar", () => {
    render(<MacroBar proteinPct={100} carbsPct={100} fatPct={0} />);

    expect(segments().map((segment) => segment.style.width)).toEqual([
      "50%",
      "50%",
      "0%",
    ]);
    expect(remainder()).toBeNull();
  });

  test("hides a zero-width segment so it leaves no stray gap", () => {
    render(<MacroBar proteinPct={50} carbsPct={50} fatPct={0} />);

    expect(segments()[2]).toHaveClass("hidden");
    expect(segments()[0]).not.toHaveClass("hidden");
  });

  test("is hidden from assistive technology", () => {
    render(<MacroBar proteinPct={30} carbsPct={40} fatPct={30} />);

    expect(document.querySelector('[data-slot="macro-bar"]')).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});

describe("MacroDot", () => {
  test("uses the macro's colour and stays decorative", () => {
    const { container } = render(<MacroDot macro="fat" />);

    expect(container.firstChild).toHaveClass("bg-fat");
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("mealTint", () => {
  test("uses the meal tokens for a day of up to four meals", () => {
    expect(mealTint(0, 4, 0.25)).toEqual({ className: "bg-meal-1" });
    expect(mealTint(3, 4, 1)).toEqual({ className: "bg-meal-4" });
    expect(mealTint(0, 1, 1)).toEqual({ className: "bg-meal-1" });
  });

  test("falls back to the opacity ramp past four meals", () => {
    expect(mealTint(0, 5, 0.25)).toEqual({
      className: "bg-primary",
      style: { opacity: 0.25 },
    });
    expect(mealTint(4, 5, 1)).toEqual({
      className: "bg-primary",
      style: { opacity: 1 },
    });
  });
});
