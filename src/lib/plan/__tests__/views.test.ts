import { describe, expect, test } from "vitest";

import { buildDay, buildDays } from "@/lib/plan/views";
import { makeGoals, makeMeal, makePlannedMeal } from "@test/factories";

const goals = makeGoals();
const [firstSlot] = goals.slots;
const DAY = "2026-10-14";

describe("buildDay", () => {
  test("lists every goals slot even with nothing planned", () => {
    const day = buildDay(goals, [], DAY, DAY);

    expect(day.slots.map((slot) => slot.id)).toEqual(
      goals.slots.map((slot) => slot.id),
    );
    expect(day.planned.calories).toBe(0);
  });

  test("carries the eaten state into the view", () => {
    const plans = [
      makePlannedMeal({
        date: DAY,
        mealSlotId: firstSlot.id,
        eaten: true,
      }),
    ];

    expect(buildDay(goals, plans, DAY, DAY).slots[0].meals[0].eaten).toBe(true);
  });

  test("ignores plans of other days", () => {
    const plans = [
      makePlannedMeal({ date: "2026-10-15", mealSlotId: firstSlot.id }),
    ];

    expect(buildDay(goals, plans, DAY, DAY).slots[0].meals).toEqual([]);
  });

  test("orders a slot's meals by position", () => {
    const plans = [
      makePlannedMeal({
        id: "later",
        date: DAY,
        mealSlotId: firstSlot.id,
        sortOrder: 1,
      }),
      makePlannedMeal({
        id: "earlier",
        date: DAY,
        mealSlotId: firstSlot.id,
        sortOrder: 0,
      }),
    ];

    expect(
      buildDay(goals, plans, DAY, DAY).slots[0].meals.map((meal) => meal.id),
    ).toEqual(["earlier", "later"]);
  });

  test("keeps two copies of one template as separate rows", () => {
    const meal = makeMeal();
    const plans = [
      makePlannedMeal({
        id: "a",
        date: DAY,
        mealSlotId: firstSlot.id,
        meal,
      }),
      makePlannedMeal({
        id: "b",
        date: DAY,
        mealSlotId: firstSlot.id,
        meal,
        sortOrder: 1,
      }),
    ];

    expect(buildDay(goals, plans, DAY, DAY).slots[0].meals).toHaveLength(2);
  });

  test("marks today, and locks days before it", () => {
    expect(buildDay(goals, [], DAY, DAY)).toMatchObject({
      isToday: true,
      isEditable: true,
    });
    expect(buildDay(goals, [], "2026-10-13", DAY)).toMatchObject({
      isToday: false,
      isEditable: false,
    });
    expect(buildDay(goals, [], "2026-10-15", DAY)).toMatchObject({
      isToday: false,
      isEditable: true,
    });
  });
});

describe("buildDays", () => {
  test("builds seven days from Monday", () => {
    const days = buildDays(goals, [], "2026-10-12", DAY);

    expect(days.map((day) => day.weekday)).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
  });
});
