import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { AuthBrand } from "@/components/auth/auth-brand";

describe("AuthBrand", () => {
  test("links the logo and wordmark to the login screen", () => {
    render(<AuthBrand />);

    expect(screen.getByRole("link", { name: "Nutria" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  test("sizes the wordmark to match the logo at both logo sizes", () => {
    render(<AuthBrand />);

    expect(screen.getByTestId("auth-logo")).toHaveClass("h-40", "sm:h-48");
    expect(screen.getByText("Nutria")).toHaveClass("text-5xl", "sm:text-6xl");
  });

  test("renders the wordmark below the logo", () => {
    render(<AuthBrand />);

    const logo = screen.getByTestId("auth-logo");
    const wordmark = screen.getByText("Nutria");

    expect(logo.parentElement).toHaveClass("flex-col");
    expect(logo.compareDocumentPosition(wordmark)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});
