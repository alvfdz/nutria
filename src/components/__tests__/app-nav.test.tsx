import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { usePathname } from "next/navigation";

import { AccountLink, AppNav } from "@/components/app-nav";

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

  test("marks a section as current on a page nested under it", () => {
    pathname.mockReturnValue("/meals/123");

    render(<AppNav />);

    expect(screen.getByRole("link", { name: "Meals" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("doesn't take a route that only starts with a section's name", () => {
    pathname.mockReturnValue("/meals-archive");

    render(<AppNav />);

    expect(screen.getByRole("link", { name: "Meals" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  test("names the phone menu after the current section", () => {
    pathname.mockReturnValue("/calendar");

    render(<AppNav />);

    expect(
      screen.getByRole("button", { name: "Section: Calendar" }),
    ).toBeInTheDocument();
  });

  test("falls back to a generic menu name outside the sections", () => {
    pathname.mockReturnValue("/account");

    render(<AppNav />);

    expect(
      screen.getByRole("button", { name: "Sections" }),
    ).toBeInTheDocument();
  });

  test("lists every section in the phone menu and marks the current one", async () => {
    pathname.mockReturnValue("/meals");

    render(<AppNav />);
    await userEvent.click(
      screen.getByRole("button", { name: "Section: Meals" }),
    );

    expect(
      await screen.findByRole("menuitem", { name: "Meals" }),
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("menuitem", { name: "Goals" })).toHaveAttribute(
      "href",
      "/goals",
    );
    expect(screen.getAllByRole("menuitem")).toHaveLength(4);
  });
});

describe("AccountLink", () => {
  test("links to the account screen", () => {
    pathname.mockReturnValue("/goals");

    render(<AccountLink />);

    const link = screen.getByRole("link", { name: "Account" });
    expect(link).toHaveAttribute("href", "/account");
    expect(link).not.toHaveAttribute("aria-current");
  });

  test("is marked as current on the account screen", () => {
    pathname.mockReturnValue("/account");

    render(<AccountLink />);

    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
