import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import AuthLayout from "@/app/(auth)/layout";

/** Renders the layout around a stand-in screen. */
function renderLayout() {
  render(AuthLayout({ children: <p>Screen</p> } as never));
}

describe("AuthLayout", () => {
  test("frames the screen with the brand and the theme toggle", () => {
    renderLayout();

    expect(screen.getByText("Screen")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nutria" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Toggle theme" }),
    ).toBeInTheDocument();
  });

  test("opts the signed-out screens into the design-system palette", () => {
    renderLayout();

    expect(screen.getByRole("main")).toHaveClass(
      "nutria-theme",
      "tabular-nums",
    );
  });
});
