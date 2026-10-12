import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { WeekNav } from "@/components/calendar/week-nav";
import { formatWeekRange } from "@/lib/calendar/week";

describe("WeekNav", () => {
  test("disables Prev and points Next at the following week on the current week", () => {
    render(<WeekNav weekStart="2026-10-12" isCurrentWeek />);

    expect(
      screen.queryByRole("link", { name: /Prev/ }),
    ).not.toBeInTheDocument();

    const prev = screen.getByRole("button", { name: /Prev/ });
    expect(prev).toBeDisabled();
    expect(prev).toHaveAttribute("aria-disabled", "true");

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

  test("always points Today at the calendar root", () => {
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
});
