import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { PageContainer } from "@/components/page-container";

describe("PageContainer", () => {
  test("renders its children", () => {
    render(
      <PageContainer>
        <p>Library</p>
      </PageContainer>,
    );

    expect(screen.getByText("Library")).toBeInTheDocument();
  });

  test("applies the shared width ladder and horizontal padding by default", () => {
    render(<PageContainer data-testid="container" />);

    expect(screen.getByTestId("container")).toHaveClass(
      "mx-auto",
      "w-full",
      "max-w-5xl",
      "px-4",
      "sm:px-6",
    );
  });

  test("merges caller classes with the defaults", () => {
    render(<PageContainer data-testid="container" className="py-10" />);

    expect(screen.getByTestId("container")).toHaveClass("py-10", "max-w-5xl");
  });

  test("lets callers override a conflicting default", () => {
    render(<PageContainer data-testid="container" className="max-w-3xl" />);

    const container = screen.getByTestId("container");
    expect(container).toHaveClass("max-w-3xl");
    expect(container).not.toHaveClass("max-w-5xl");
  });

  test('width="full" drops the width ladder but keeps the padding', () => {
    render(<PageContainer data-testid="container" width="full" />);

    const container = screen.getByTestId("container");
    expect(container).toHaveClass("mx-auto", "w-full", "px-4", "sm:px-6");
    expect(container).not.toHaveClass("max-w-5xl");
    expect(container).not.toHaveClass("2xl:max-w-[100rem]");
  });
});
