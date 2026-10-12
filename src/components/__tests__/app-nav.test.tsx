import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { usePathname } from "next/navigation";

import { AppNav } from "@/components/app-nav";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

const pathname = vi.mocked(usePathname);

beforeEach(() => {
  pathname.mockReset();
});

describe("AppNav", () => {
  test("links to every section from a labelled navigation landmark", () => {
    pathname.mockReturnValue("/");

    render(<AppNav />);

    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Goals" })).toHaveAttribute(
      "href",
      "/goals",
    );
    expect(screen.getByRole("link", { name: "Ingredients" })).toHaveAttribute(
      "href",
      "/ingredients",
    );
    expect(screen.getByRole("link", { name: "Meals" })).toHaveAttribute(
      "href",
      "/meals",
    );
    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute(
      "href",
      "/calendar",
    );
  });

  test("marks the section the user is on as the current page", () => {
    pathname.mockReturnValue("/meals");

    render(<AppNav />);

    expect(screen.getByRole("link", { name: "Meals" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Ingredients" }),
    ).not.toHaveAttribute("aria-current");
  });

  test("marks the ingredients section as current on the ingredients route", () => {
    pathname.mockReturnValue("/ingredients");

    render(<AppNav />);

    expect(screen.getByRole("link", { name: "Ingredients" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Meals" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  test("marks the goals section as current on the goals route", () => {
    pathname.mockReturnValue("/goals");

    render(<AppNav />);

    expect(screen.getByRole("link", { name: "Goals" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Ingredients" }),
    ).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Meals" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  test("marks the calendar section as current on the calendar route", () => {
    pathname.mockReturnValue("/calendar");

    render(<AppNav />);

    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Meals" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  test("leaves every link inactive on a route outside the sections", () => {
    pathname.mockReturnValue("/");

    render(<AppNav />);

    expect(screen.getByRole("link", { name: "Goals" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(
      screen.getByRole("link", { name: "Ingredients" }),
    ).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Meals" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: "Calendar" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
