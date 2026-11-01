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

  test("renders the logo placeholder and the wordmark", () => {
    render(<AuthBrand />);

    expect(screen.getByTestId("auth-logo")).toBeInTheDocument();
    expect(screen.getByText("Nutria")).toBeInTheDocument();
  });

  test("marks the logo with the brand accent", () => {
    render(<AuthBrand />);

    expect(screen.getByTestId("auth-logo")).toHaveClass("text-brand");
  });
});
