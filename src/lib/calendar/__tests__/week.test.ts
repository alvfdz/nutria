import { describe, expect, test } from "vitest";

import {
  addDays,
  addWeeks,
  clampWeekToCurrent,
  formatDayLabel,
  formatWeekRange,
  isDateKey,
  parseWeekParam,
  startOfWeek,
  todayKey,
  toDateKey,
  weekDays,
} from "@/lib/calendar/week";

describe("toDateKey", () => {
  test("reads the local calendar day of a Date", () => {
    expect(toDateKey(new Date(2026, 9, 12, 23, 59))).toBe("2026-10-12");
    expect(toDateKey(new Date(2026, 0, 1, 0, 0))).toBe("2026-01-01");
  });
});

describe("startOfWeek", () => {
  test("returns the same Monday for all seven days of one week", () => {
    const days = [
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
    ];

    for (const day of days) {
      expect(startOfWeek(day)).toBe("2026-10-12");
    }
  });

  test("walks a Sunday back to the Monday before it", () => {
    expect(startOfWeek("2026-10-18")).toBe("2026-10-12");
  });
});

describe("addDays", () => {
  test("crosses a month end", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });

  test("crosses a year end in both directions", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  test("steps over a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
  });

  test("round-trips a key through addDays and addWeeks", () => {
    expect(addDays(addWeeks("2026-03-15", 2), -14)).toBe("2026-03-15");
    expect(addWeeks(addDays("2026-03-15", 14), -2)).toBe("2026-03-15");
  });
});

describe("addWeeks", () => {
  test("moves whole weeks forwards and backwards", () => {
    expect(addWeeks("2026-10-12", 1)).toBe("2026-10-19");
    expect(addWeeks("2026-10-12", -1)).toBe("2026-10-05");
  });

  test("crosses a year boundary", () => {
    expect(addWeeks("2026-12-28", 1)).toBe("2027-01-04");
  });
});

describe("weekDays", () => {
  test("returns seven keys, Monday first and Sunday last", () => {
    const days = weekDays("2026-10-12");

    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-10-12");
    expect(days[6]).toBe("2026-10-18");
  });
});

describe("isDateKey", () => {
  test("accepts a real calendar day", () => {
    expect(isDateKey("2026-10-12")).toBe(true);
    expect(isDateKey("2028-02-29")).toBe(true);
  });

  test.each(["2026-02-31", "2026-2-3", "2026-13-01", "2026-00-10", ""])(
    "rejects %s",
    (value) => {
      expect(isDateKey(value)).toBe(false);
    },
  );

  test("rejects non-strings and nonsense", () => {
    expect(isDateKey("nonsense")).toBe(false);
    expect(isDateKey(undefined)).toBe(false);
    expect(isDateKey(20261012)).toBe(false);
  });
});

describe("formatWeekRange", () => {
  test("writes the month once within a month", () => {
    expect(formatWeekRange("2026-10-12")).toBe("12 – 18 Oct 2026");
  });

  test("repeats the month when the week straddles a boundary", () => {
    expect(formatWeekRange("2026-04-27")).toBe("27 Apr – 3 May 2026");
  });

  test("repeats the year when the week straddles a year", () => {
    expect(formatWeekRange("2025-12-29")).toBe("29 Dec 2025 – 4 Jan 2026");
  });
});

describe("formatDayLabel", () => {
  test("writes the weekday and day number", () => {
    expect(formatDayLabel("2026-10-12")).toBe("Mon 12");
  });

  test("adds the month on the first of a month", () => {
    expect(formatDayLabel("2026-08-01")).toBe("Sat 1 Aug");
  });
});

describe("parseWeekParam", () => {
  test("turns a mid-week date into its Monday", () => {
    expect(parseWeekParam("2026-10-15")).toBe("2026-10-12");
  });

  test("keeps a Monday as itself", () => {
    expect(parseWeekParam("2026-10-12")).toBe("2026-10-12");
  });

  test("uses the first entry of a repeated parameter", () => {
    expect(parseWeekParam(["2026-10-15", "2026-11-01"])).toBe("2026-10-12");
  });

  test.each([undefined, "", "nonsense", "2026-02-31", ["junk", "2026-10-15"]])(
    "falls back to the current week for %s",
    (value) => {
      expect(parseWeekParam(value)).toBe(startOfWeek(todayKey()));
    },
  );
});

describe("clampWeekToCurrent", () => {
  test("snaps a past week up to the current one", () => {
    expect(clampWeekToCurrent("2020-01-06")).toBe(startOfWeek(todayKey()));
  });

  test("leaves a future week alone", () => {
    expect(clampWeekToCurrent("2030-01-07")).toBe("2030-01-07");
  });
});
