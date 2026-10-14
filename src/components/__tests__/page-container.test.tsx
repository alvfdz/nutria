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

  test("applies the content width tier and horizontal padding by default", () => {
    render(<PageContainer data-testid="container" />);

    expect(screen.getByTestId("container")).toHaveClass(
      "mx-auto",
      "w-full",
      "max-w-5xl",
      "lg:max-w-6xl",
      "xl:max-w-7xl",
      "px-4",
      "sm:px-6",
    );
  });

  test("the content tier stops growing at 1280px", () => {
    render(<PageContainer data-testid="container" />);

    const container = screen.getByTestId("container");
    expect(container).toHaveClass("xl:max-w-7xl");
    expect(container).not.toHaveClass("2xl:max-w-[100rem]");
    expect(container).not.toHaveClass("2xl:max-w-[112.5rem]");
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

  test('width="wide" uncaps below 2xl and caps at 1800px above it', () => {
    render(<PageContainer data-testid="container" width="wide" />);

    const container = screen.getByTestId("container");
    expect(container).toHaveClass("mx-auto", "w-full", "px-4", "sm:px-6");
    expect(container).toHaveClass("2xl:max-w-[112.5rem]");
    expect(container).not.toHaveClass("max-w-5xl");
    expect(container).not.toHaveClass("lg:max-w-6xl");
    expect(container).not.toHaveClass("xl:max-w-7xl");
  });
});
