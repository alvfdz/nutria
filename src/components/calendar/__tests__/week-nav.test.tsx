import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, test, vi } from "vitest";

import { WeekNav } from "@/components/calendar/week-nav";
import { WEEK_BACK, WEEK_FORWARD } from "@/components/calendar/week-slide";
import { formatWeekRange } from "@/lib/calendar/week";

// `transitionTypes` never reaches the DOM, so the stub writes it out as an
// attribute for the tests to read.
vi.mock("next/link", () => ({
  default: ({
    transitionTypes,
    scroll,
    ...props
  }: ComponentProps<"a"> & {
    transitionTypes?: string[];
    scroll?: boolean;
  }) => (
    <a
      data-transition-types={transitionTypes?.join(" ")}
      data-scroll={String(scroll)}
      {...props}
    />
  ),
}));

describe("WeekNav", () => {
  test("disables Prev and points Next at the following week on the current week", () => {
    render(<WeekNav weekStart="2026-10-12" isCurrentWeek />);

    expect(
      screen.queryByRole("link", { name: /Prev/ }),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Previous week" }),
    ).toBeDisabled();

    expect(screen.getByRole("link", { name: /Next/ })).toHaveAttribute(
      "href",
      "?week=2026-10-19",
    );
  });

  test("links Prev back a week on a future week", () => {
    render(<WeekNav weekStart="2026-11-02" isCurrentWeek={false} />);

    expect(screen.getByRole("link", { name: /Prev/ })).toHaveAttribute(
      "href",
      "?week=2026-10-26",
    );
    expect(screen.getByRole("link", { name: /Next/ })).toHaveAttribute(
      "href",
      "?week=2026-11-09",
    );
  });

  test("labels the icon-only controls by what they do", () => {
    render(<WeekNav weekStart="2026-11-02" isCurrentWeek={false} />);

    expect(
      screen.getByRole("link", { name: "Previous week" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Next week" })).toBeInTheDocument();
  });

  test("drops the base's transparent border from outline links", () => {
    render(<WeekNav weekStart="2026-11-02" isCurrentWeek={false} />);

    for (const name of ["Today", "Previous week", "Next week"]) {
      expect(screen.getByRole("link", { name })).not.toHaveClass(
        "border-transparent",
      );
    }
  });

  test("leaves Today out on the current week, where it would go nowhere", () => {
    render(<WeekNav weekStart="2026-10-12" isCurrentWeek />);

    expect(screen.queryByRole("link", { name: "Today" })).toBeNull();
  });

  test("points Today at the calendar root on any other week", () => {
    render(<WeekNav weekStart="2026-11-02" isCurrentWeek={false} />);

    expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute(
      "href",
      "/calendar",
    );
  });

  test("shows the range label for the shown week", () => {
    render(<WeekNav weekStart="2026-10-12" isCurrentWeek />);

    expect(screen.getByText(formatWeekRange("2026-10-12"))).toBeInTheDocument();
  });

  test("tags Next as forward, and Prev and Today as back, for the slide", () => {
    render(<WeekNav weekStart="2026-11-02" isCurrentWeek={false} />);

    expect(screen.getByRole("link", { name: "Next week" })).toHaveAttribute(
      "data-transition-types",
      WEEK_FORWARD,
    );
    for (const name of ["Previous week", "Today"]) {
      expect(screen.getByRole("link", { name })).toHaveAttribute(
        "data-transition-types",
        WEEK_BACK,
      );
    }
  });
});
