import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { StatusLine } from "@/components/goals/status-line";

describe("StatusLine", () => {
  test("marks a valid state with a brand tick and muted text", () => {
    const { container } = render(
      <StatusLine valid>Macros total 100%</StatusLine>,
    );

    const line = screen.getByText("Macros total 100%").parentElement;
    expect(line).toHaveClass("text-muted-foreground");
    expect(container.querySelector("svg")).toHaveClass("text-brand");
  });

  test("marks an invalid state with destructive text and icon", () => {
    const { container } = render(
      <StatusLine valid={false}>Macros total 95%</StatusLine>,
    );

    const line = screen.getByText("Macros total 95%").parentElement;
    expect(line).toHaveClass("text-destructive");
    expect(container.querySelector("svg")).toHaveClass("text-destructive");
  });

  test("exposes its id for aria-describedby", () => {
    const { container } = render(
      <StatusLine valid={false} id="calories-error">
        Calories is required
      </StatusLine>,
    );

    expect(container.querySelector("#calories-error")).toHaveTextContent(
      "Calories is required",
    );
  });
});
