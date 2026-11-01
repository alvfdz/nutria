import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { FieldError, StatusLine } from "@/components/status-line";

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

  test("announces itself when given the alert role", () => {
    render(
      <StatusLine valid={false} role="alert">
        Could not save
      </StatusLine>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
  });

  test("merges extra classes", () => {
    render(
      <StatusLine valid={false} role="alert" className="max-w-40">
        Could not save
      </StatusLine>,
    );

    expect(screen.getByRole("alert")).toHaveClass("max-w-40");
  });
});

describe("FieldError", () => {
  test("shows only the first message, under the given id", () => {
    const { container } = render(
      <FieldError id="fat-error" errors={["Fat is required", "Too high"]} />,
    );

    expect(container.querySelector("#fat-error")).toHaveTextContent(
      "Fat is required",
    );
    expect(screen.queryByText("Too high")).not.toBeInTheDocument();
  });

  test.each([[undefined], [[]]])("renders nothing for %j", (errors) => {
    const { container } = render(<FieldError id="fat-error" errors={errors} />);

    expect(container).toBeEmptyDOMElement();
  });
});
