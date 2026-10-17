import { connection } from "next/server";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import {
  assignMeal,
  getPlannedMeal,
  getPlansForRange,
  listPlansForSlot,
  removePlannedMeal,
} from "@/lib/plan/repository";

// Same hand-rolled Prisma stub as the other suites: fast, no PostgreSQL
// container, and every assertion is on the call shape the repository sends.
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ getPrisma: vi.fn() }));

const planMeal = {
  findMany: vi.fn(),
  findUnique: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
};

const createdAt = new Date("2026-05-04T10:20:30.000Z");
const ingredientCreatedAt = new Date("2026-01-02T03:04:05.678Z");
const OATS_ID = "9f1c1f9e-0000-4000-8000-000000000001";
const DATE = new Date(Date.UTC(2026, 9, 13));

/** The same include shape plan reads embed: the meal, its items, ingredients. */
const include = {
  meal: {
    include: {
      items: { include: { ingredient: true }, orderBy: { sortOrder: "asc" } },
    },
  },
};

/** The embedded meal row as Prisma returns it. */
function dbMeal() {
  return {
    id: "meal-1",
    name: "Oatmeal & Protein Bowl",
    createdAt,
    items: [
      {
        id: "item-1",
        grams: 80,
        sortOrder: 0,
        mealId: "meal-1",
        ingredientId: OATS_ID,
        ingredient: {
          id: OATS_ID,
          name: "Oats",
          caloriesPer100g: 389,
          proteinPer100g: 16.9,
          carbsPer100g: 66.3,
          fatPer100g: 6.9,
          createdAt: ingredientCreatedAt,
        },
      },
    ],
  };
}

/** A plan row as Prisma returns it, with the meal embedded. */
function dbRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "plan-meal-1",
    date: DATE,
    mealSlotId: "meal-slot-1",
    mealId: "meal-1",
    sortOrder: 0,
    createdAt,
    meal: dbMeal(),
    ...overrides,
  };
}

/** The same row after `toPlannedMeal`: strings for every timestamp. */
function mappedRow() {
  return {
    id: "plan-meal-1",
    date: "2026-10-13",
    mealSlotId: "meal-slot-1",
    mealId: "meal-1",
    sortOrder: 0,
    meal: {
      id: "meal-1",
      name: "Oatmeal & Protein Bowl",
      createdAt: "2026-05-04T10:20:30.000Z",
      items: [
        {
          id: "item-1",
          grams: 80,
          sortOrder: 0,
          mealId: "meal-1",
          ingredientId: OATS_ID,
          ingredient: {
            id: OATS_ID,
            name: "Oats",
            caloriesPer100g: 389,
            proteinPer100g: 16.9,
            carbsPer100g: 66.3,
            fatPer100g: 6.9,
            createdAt: "2026-01-02T03:04:05.678Z",
          },
        },
      ],
    },
  };
}

/** The `P2025` Prisma throws when a delete matches no row. */
function notFound(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "7.10.0",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPrisma).mockReturnValue({ planMeal } as unknown as ReturnType<
    typeof getPrisma
  >);
  vi.mocked(connection).mockResolvedValue(undefined);
});

describe("getPlansForRange", () => {
  test("awaits connection() before querying", async () => {
    planMeal.findMany.mockResolvedValue([]);

    await getPlansForRange(DATE, DATE);

    expect(connection).toHaveBeenCalledOnce();
    expect(connection).toHaveBeenCalledBefore(planMeal.findMany);
  });

  test("scopes the range and reads the meal with its items", async () => {
    planMeal.findMany.mockResolvedValue([]);
    const end = new Date(Date.UTC(2026, 9, 19));

    await getPlansForRange(DATE, end);

    expect(planMeal.findMany).toHaveBeenCalledWith({
      where: { date: { gte: DATE, lte: end } },
      include,
      orderBy: [{ date: "asc" }, { mealSlotId: "asc" }, { sortOrder: "asc" }],
    });
  });

  test("maps rows to day keys and ISO timestamps", async () => {
    planMeal.findMany.mockResolvedValue([dbRow()]);

    await expect(getPlansForRange(DATE, DATE)).resolves.toEqual([mappedRow()]);
  });
});

describe("getPlannedMeal", () => {
  test("reads one row by id with the meal embedded", async () => {
    planMeal.findUnique.mockResolvedValue(dbRow());

    await expect(getPlannedMeal("plan-meal-1")).resolves.toEqual(mappedRow());
    expect(planMeal.findUnique).toHaveBeenCalledWith({
      where: { id: "plan-meal-1" },
      include,
    });
  });

  test("returns null when no row has that id", async () => {
    planMeal.findUnique.mockResolvedValue(null);

    await expect(getPlannedMeal("missing")).resolves.toBeNull();
  });
});

describe("assignMeal", () => {
  test("appends after what is already in the slot, copies included", async () => {
    // Two rows already in the slot — possibly two copies of the same
    // template — so the next one, duplicate or not, takes position 2.
    planMeal.count.mockResolvedValue(2);
    planMeal.create.mockResolvedValue(dbRow());

    await assignMeal(DATE, "meal-slot-1", "meal-1");

    expect(planMeal.count).toHaveBeenCalledWith({
      where: { date: DATE, mealSlotId: "meal-slot-1" },
    });
    expect(planMeal.create).toHaveBeenCalledWith({
      data: {
        date: DATE,
        mealSlotId: "meal-slot-1",
        mealId: "meal-1",
        sortOrder: 2,
      },
    });
  });

  test("rethrows any other failure as is", async () => {
    const failure = new Error("connection terminated");
    planMeal.count.mockRejectedValue(failure);

    await expect(assignMeal(DATE, "meal-slot-1", "meal-1")).rejects.toBe(
      failure,
    );
  });
});

describe("removePlannedMeal", () => {
  test("deletes the row addressed by id", async () => {
    planMeal.delete.mockResolvedValue(dbRow());

    await removePlannedMeal("plan-meal-1");

    expect(planMeal.delete).toHaveBeenCalledWith({
      where: { id: "plan-meal-1" },
    });
  });

  test("names the plan when Prisma reports it missing", async () => {
    planMeal.delete.mockRejectedValue(notFound());

    await expect(removePlannedMeal("missing")).rejects.toThrow(
      "Unknown plan meal: missing",
    );
  });
});

describe("listPlansForSlot", () => {
  test("reads the slot's forward plans and returns their day keys", async () => {
    const from = new Date(Date.UTC(2026, 9, 13));
    planMeal.findMany.mockResolvedValue([
      { date: new Date(Date.UTC(2026, 9, 13)) },
      { date: new Date(Date.UTC(2026, 9, 20)) },
    ]);

    await expect(listPlansForSlot("meal-slot-1", from)).resolves.toEqual([
      "2026-10-13",
      "2026-10-20",
    ]);
    expect(planMeal.findMany).toHaveBeenCalledWith({
      where: { mealSlotId: "meal-slot-1", date: { gte: from } },
      select: { date: true },
      orderBy: { date: "asc" },
    });
  });
});
