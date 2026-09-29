import { beforeEach, describe, expect, test } from "vitest";

import { makeIngredient } from "@test/factories";
import {
  deleteIngredient,
  insertIngredient,
  readIngredients,
  updateIngredient,
} from "@/lib/ingredients/memory-store";
import type { Ingredient } from "@/lib/ingredients/types";

const globalStore = globalThis as typeof globalThis & {
  __nutriaIngredients?: Ingredient[];
};

let chicken: Ingredient;
let cod: Ingredient;
let oats: Ingredient;

beforeEach(() => {
  delete globalStore.__nutriaIngredients;
  chicken = makeIngredient({ id: "chicken", name: "Chicken breast" });
  cod = makeIngredient({
    id: "cod",
    name: "Cod",
    createdAt: "2026-02-01T00:00:00.000Z",
  });
  oats = makeIngredient({
    id: "oats",
    name: "Oats",
    createdAt: "2026-03-01T00:00:00.000Z",
  });
});

describe("insertIngredient and readIngredients", () => {
  test("round-trips an inserted ingredient", () => {
    insertIngredient(chicken);
    expect(readIngredients()).toEqual([chicken]);
  });

  test("returns the newest ingredient first", () => {
    insertIngredient(chicken);
    insertIngredient(cod);
    insertIngredient(oats);

    expect(readIngredients().map((ingredient) => ingredient.id)).toEqual([
      "oats",
      "cod",
      "chicken",
    ]);
  });

  test("hands back an array the caller cannot grow the store with", () => {
    insertIngredient(chicken);

    readIngredients().push(cod);

    expect(readIngredients()).toEqual([chicken]);
  });
});

describe("updateIngredient", () => {
  test("replaces the editable fields and keeps the identity", () => {
    insertIngredient(chicken);

    const updated = updateIngredient("chicken", {
      name: "Cooked chicken",
      caloriesPer100g: 200,
      proteinPer100g: 30,
      carbsPer100g: 1,
      fatPer100g: 5,
    });

    expect(updated).toEqual({
      id: "chicken",
      createdAt: chicken.createdAt,
      name: "Cooked chicken",
      caloriesPer100g: 200,
      proteinPer100g: 30,
      carbsPer100g: 1,
      fatPer100g: 5,
    });
    expect(readIngredients()).toEqual([updated]);
  });

  test("returns null for an unknown id", () => {
    expect(updateIngredient("missing", chicken)).toBeNull();
  });

  test("leaves the other ingredients alone", () => {
    insertIngredient(chicken);
    insertIngredient(cod);

    updateIngredient("cod", { ...cod, name: "Haddock" });

    expect(readIngredients().map((ingredient) => ingredient.name)).toEqual([
      "Haddock",
      "Chicken breast",
    ]);
  });
});

describe("deleteIngredient", () => {
  test("removes only the matching ingredient", () => {
    insertIngredient(chicken);
    insertIngredient(cod);

    expect(deleteIngredient("chicken")).toBe(true);
    expect(readIngredients()).toEqual([cod]);
  });

  test("returns false for an unknown id", () => {
    insertIngredient(cod);

    expect(deleteIngredient("missing")).toBe(false);
    expect(readIngredients()).toEqual([cod]);
  });

  test("returns false when the store is empty", () => {
    expect(deleteIngredient("chicken")).toBe(false);
  });
});
