import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { StatTiles } from "@/components/stat-tile";
import { THIN_SPACE } from "@/lib/design-system";

describe("StatTiles", () => {
  test("shows protein, carbs and fat in that order, with their grams", () => {
    render(<StatTiles protein="63" carbs="0" fat="7.2" />);

    expect(screen.getAllByRole("term").map((n) => n.textContent)).toEqual([
      "Protein",
      "Carbs",
      "Fat",
    ]);
    expect(screen.getAllByRole("definition").map((n) => n.textContent)).toEqual(
      [`63${THIN_SPACE}g`, `0${THIN_SPACE}g`, `7.2${THIN_SPACE}g`],
    );
  });

  test("marks each macro with its colour", () => {
    const { container } = render(<StatTiles protein="1" carbs="2" fat="3" />);

    for (const color of ["bg-protein", "bg-carbs", "bg-fat"]) {
      expect(container.querySelector(`.${color}`)).toBeInTheDocument();
    }
  });
});
