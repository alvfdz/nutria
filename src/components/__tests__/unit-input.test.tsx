import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { UnitInput } from "@/components/unit-input";

describe("UnitInput", () => {
  test("passes its attributes to the input", () => {
    render(<UnitInput unit="g" aria-label="Fat" name="fat" type="number" />);

    const input = screen.getByLabelText("Fat");
    expect(input).toHaveAttribute("name", "fat");
    expect(input).toHaveAttribute("type", "number");
  });

  test("shows the unit but hides it from assistive technology", () => {
    render(<UnitInput unit="kcal" aria-label="Calories" />);

    expect(screen.getByText("kcal")).toHaveAttribute("aria-hidden", "true");
  });

  test("applies each class list to its own element", () => {
    const { container } = render(
      <UnitInput
        unit="g"
        aria-label="Fat"
        className="input-class"
        groupClassName="group-class"
      />,
    );

    expect(screen.getByLabelText("Fat")).toHaveClass("input-class");
    expect(container.firstChild).toHaveClass("group-class");
  });
});
