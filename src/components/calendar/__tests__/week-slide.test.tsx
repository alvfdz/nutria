import { render, screen } from "@testing-library/react";
import { ViewTransition } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  WEEK_BACK,
  WEEK_FORWARD,
  WeekSlide,
} from "@/components/calendar/week-slide";

/** The props the last `ViewTransition` render was given. */
function lastProps() {
  return vi.mocked(ViewTransition).mock.lastCall?.[0];
}

beforeEach(() => {
  vi.mocked(ViewTransition).mockClear();
});

describe("WeekSlide", () => {
  test("renders the week's content", () => {
    render(
      <WeekSlide weekStart="2026-11-02">
        <p>Board</p>
      </WeekSlide>,
    );

    expect(screen.getByText("Board")).toBeInTheDocument();
  });

  test("slides each way on the matching transition type", () => {
    render(
      <WeekSlide weekStart="2026-11-02">
        <p>Board</p>
      </WeekSlide>,
    );

    const expected = {
      [WEEK_FORWARD]: "week-slide-forward",
      [WEEK_BACK]: "week-slide-back",
      default: "none",
    };
    expect(lastProps()).toMatchObject({
      enter: expected,
      exit: expected,
      default: "none",
    });
  });

  test("remounts the content when the week changes, so the slide runs", () => {
    const { rerender } = render(
      <WeekSlide weekStart="2026-11-02">
        <input aria-label="Probe" defaultValue="old" />
      </WeekSlide>,
    );
    const first = screen.getByLabelText("Probe");

    rerender(
      <WeekSlide weekStart="2026-11-02">
        <input aria-label="Probe" defaultValue="old" />
      </WeekSlide>,
    );
    expect(screen.getByLabelText("Probe")).toBe(first);

    rerender(
      <WeekSlide weekStart="2026-11-09">
        <input aria-label="Probe" defaultValue="old" />
      </WeekSlide>,
    );
    expect(screen.getByLabelText("Probe")).not.toBe(first);
  });

  test("uses distinct transition types for each direction", () => {
    expect(WEEK_FORWARD).not.toBe(WEEK_BACK);
  });
});
