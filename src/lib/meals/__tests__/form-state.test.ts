import { describe, expect, test } from "vitest";

import { keyMealErrorsByRow, mealRowErrorKey } from "@/lib/meals/form-state";

describe("keyMealErrorsByRow", () => {
  test("attaches row messages to the rows' keys", () => {
    expect(
      keyMealErrorsByRow(
        {
          "items.0.ingredientId": ["Pick one."],
          "items.1.grams": ["Weigh it."],
        },
        ["row-3", "row-7"],
      ),
    ).toEqual({
      [mealRowErrorKey("row-3", "ingredientId")]: ["Pick one."],
      [mealRowErrorKey("row-7", "grams")]: ["Weigh it."],
    });
  });

  test("keeps the messages that aren't about a row", () => {
    expect(
      keyMealErrorsByRow({ name: ["Name it."], items: ["Add one."] }, []),
    ).toEqual({ name: ["Name it."], items: ["Add one."] });
  });

  test("drops a message for a row that is no longer there", () => {
    expect(
      keyMealErrorsByRow({ "items.2.grams": ["Weigh it."] }, ["row-0"]),
    ).toEqual({});
  });

  test("is empty without messages", () => {
    expect(keyMealErrorsByRow({}, ["row-0"])).toEqual({});
  });
});
