import { connection } from "next/server";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ingredientDefaults, makeIngredient } from "@test/factories";
import {
  createIngredient,
  deleteIngredient,
  listIngredients,
  updateIngredient,
} from "@/lib/ingredients/repository";
import type { Ingredient } from "@/lib/ingredients/types";

vi.mock("next/server", () => ({ connection: vi.fn() }));

const globalStore = globalThis as typeof globalThis & {
  __nutriaIngredients?: Ingredient[];
};

const input = { ...ingredientDefaults };

beforeEach(() => {
  delete globalStore.__nutriaIngredients;
  vi.mocked(connection).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createIngredient", () => {
  test("assigns a UUID id and persists the ingredient", async () => {
    const created = await createIngredient(input);

    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(created).toMatchObject(input);
    expect(await listIngredients()).toEqual([created]);
  });

  test("stamps an ISO creation timestamp", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-04T10:20:30.000Z"));

    const created = await createIngredient(input);

    expect(created.createdAt).toBe("2026-05-04T10:20:30.000Z");
  });
});

describe("listIngredients", () => {
  test("waits for connection() so the route renders per request", async () => {
    await listIngredients();

    expect(connection).toHaveBeenCalledOnce();
  });

  test("returns the stored ingredients newest first", async () => {
    vi.useFakeTimers();

    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const first = await createIngredient({ ...input, name: "First" });

    vi.setSystemTime(new Date("2026-01-02T00:00:00.000Z"));
    const second = await createIngredient({ ...input, name: "Second" });

    vi.setSystemTime(new Date("2026-01-03T00:00:00.000Z"));
    const third = await createIngredient({ ...input, name: "Third" });

    expect((await listIngredients()).map((item) => item.id)).toEqual([
      third.id,
      second.id,
      first.id,
    ]);
  });
});

describe("updateIngredient", () => {
  test("replaces the editable fields and keeps the identity", async () => {
    const stored = await createIngredient(input);

    const updated = await updateIngredient(stored.id, {
      ...input,
      name: "Cooked chicken",
    });

    expect(updated).toEqual({ ...stored, name: "Cooked chicken" });
    expect(await listIngredients()).toEqual([updated]);
  });

  test("throws for an unknown id", async () => {
    await expect(updateIngredient("missing", input)).rejects.toThrow(
      "Unknown ingredient: missing",
    );
  });
});

describe("deleteIngredient", () => {
  test("removes the ingredient", async () => {
    const stored = await createIngredient(input);

    await deleteIngredient(stored.id);

    expect(await listIngredients()).toEqual([]);
  });

  test("throws for an unknown id", async () => {
    await expect(deleteIngredient("missing")).rejects.toThrow(
      "Unknown ingredient: missing",
    );
  });

  test("leaves the other ingredients in place", async () => {
    const first = makeIngredient({ id: "cod", name: "Cod" });
    globalStore.__nutriaIngredients = [first, await createIngredient(input)];

    await deleteIngredient("cod");

    expect(await listIngredients()).toHaveLength(1);
  });
});
