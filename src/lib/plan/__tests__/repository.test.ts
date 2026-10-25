import { connection } from "next/server";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { getPrisma } from "@/lib/db/prisma";
import { PlanTargetNotFoundError } from "@/lib/plan/errors";
import {
  assignMeal,
  getPlannedMeal,
  getPlansForRange,
  listPlansForSlot,
  removePlannedMeal,
} from "@/lib/plan/repository";
import { testUser } from "@test/factories";

// Same hand-rolled Prisma stub as the other suites: fast, no PostgreSQL
// container, and every assertion is on the call shape the repository sends.
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ getPrisma: vi.fn() }));

const planMeal = {
  findMany: vi.fn(),
  findFirst: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  deleteMany: vi.fn(),
};

/** Ownership checks `assignMeal` runs before it writes. */
const meal = { count: vi.fn() };
const mealSlot = { count: vi.fn() };

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
    userId: testUser.id,
    meal: dbMeal(),
    ...overrides,
  };
}

/**
 * The same row after `toPlannedMeal`: strings for every timestamp, and no
 * `userId`.
 */
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPrisma).mockReturnValue({
    planMeal,
    meal,
    mealSlot,
  } as unknown as ReturnType<typeof getPrisma>);
  vi.mocked(connection).mockResolvedValue(undefined);
  meal.count.mockResolvedValue(1);
  mealSlot.count.mockResolvedValue(1);
});

describe("getPlansForRange", () => {
  test("awaits connection() before querying", async () => {
    planMeal.findMany.mockResolvedValue([]);

    await getPlansForRange(testUser.id, DATE, DATE);

    expect(connection).toHaveBeenCalledOnce();
    expect(connection).toHaveBeenCalledBefore(planMeal.findMany);
  });

  test("scopes the user and the range and reads the meal with its items", async () => {
    planMeal.findMany.mockResolvedValue([]);
    const end = new Date(Date.UTC(2026, 9, 19));

    await getPlansForRange(testUser.id, DATE, end);

    expect(planMeal.findMany).toHaveBeenCalledWith({
      where: { userId: testUser.id, date: { gte: DATE, lte: end } },
      include,
      orderBy: [{ date: "asc" }, { mealSlotId: "asc" }, { sortOrder: "asc" }],
    });
  });

  test("maps rows to day keys and ISO timestamps, dropping the owner", async () => {
    planMeal.findMany.mockResolvedValue([dbRow()]);

    await expect(getPlansForRange(testUser.id, DATE, DATE)).resolves.toEqual([
      mappedRow(),
    ]);
  });
});

describe("getPlannedMeal", () => {
  test("reads one of the user's rows by id with the meal embedded", async () => {
    planMeal.findFirst.mockResolvedValue(dbRow());

    await expect(getPlannedMeal(testUser.id, "plan-meal-1")).resolves.toEqual(
      mappedRow(),
    );
    expect(planMeal.findFirst).toHaveBeenCalledWith({
      where: { id: "plan-meal-1", userId: testUser.id },
      include,
    });
  });

  test("returns null when the user has no row with that id", async () => {
    planMeal.findFirst.mockResolvedValue(null);

    await expect(getPlannedMeal(testUser.id, "missing")).resolves.toBeNull();
  });
});

describe("assignMeal", () => {
  test("appends after what is already in the slot, copies included", async () => {
    // Two rows already in the slot — possibly two copies of the same
    // template — so the next one, duplicate or not, takes position 2.
    planMeal.count.mockResolvedValue(2);
    planMeal.create.mockResolvedValue(dbRow());

    await assignMeal(testUser.id, DATE, "meal-slot-1", "meal-1");

    expect(planMeal.count).toHaveBeenCalledWith({
      where: { userId: testUser.id, date: DATE, mealSlotId: "meal-slot-1" },
    });
    expect(planMeal.create).toHaveBeenCalledWith({
      data: {
        userId: testUser.id,
        date: DATE,
        mealSlotId: "meal-slot-1",
        mealId: "meal-1",
        sortOrder: 2,
      },
    });
  });

  test("checks that the user owns both the meal and the slot", async () => {
    planMeal.count.mockResolvedValue(0);

    await assignMeal(testUser.id, DATE, "meal-slot-1", "meal-1");

    expect(meal.count).toHaveBeenCalledWith({
      where: { id: "meal-1", userId: testUser.id },
    });
    expect(mealSlot.count).toHaveBeenCalledWith({
      where: { id: "meal-slot-1", goals: { userId: testUser.id } },
    });
  });

  test("refuses a meal the user does not own", async () => {
    meal.count.mockResolvedValue(0);

    const failure = await assignMeal(
      testUser.id,
      DATE,
      "meal-slot-1",
      "foreign-meal",
    ).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(PlanTargetNotFoundError);
    expect((failure as PlanTargetNotFoundError).target).toBe("meal");
    expect(planMeal.create).not.toHaveBeenCalled();
  });

  test("refuses a slot the user does not own", async () => {
    mealSlot.count.mockResolvedValue(0);

    const failure = await assignMeal(
      testUser.id,
      DATE,
      "foreign-slot",
      "meal-1",
    ).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(PlanTargetNotFoundError);
    expect((failure as PlanTargetNotFoundError).target).toBe("slot");
    expect(planMeal.create).not.toHaveBeenCalled();
  });

  test("rethrows any other failure as is", async () => {
    const failure = new Error("connection terminated");
    planMeal.count.mockRejectedValue(failure);

    await expect(
      assignMeal(testUser.id, DATE, "meal-slot-1", "meal-1"),
    ).rejects.toBe(failure);
  });
});

describe("removePlannedMeal", () => {
  test("deletes the user's row addressed by id", async () => {
    planMeal.deleteMany.mockResolvedValue({ count: 1 });

    await removePlannedMeal(testUser.id, "plan-meal-1");

    expect(planMeal.deleteMany).toHaveBeenCalledWith({
      where: { id: "plan-meal-1", userId: testUser.id },
    });
  });

  test("names the plan when the user has no row with that id", async () => {
    planMeal.deleteMany.mockResolvedValue({ count: 0 });

    await expect(removePlannedMeal(testUser.id, "missing")).rejects.toThrow(
      "Unknown plan meal: missing",
    );
  });
});

describe("listPlansForSlot", () => {
  test("reads the user's forward plans in the slot and returns their day keys", async () => {
    const from = new Date(Date.UTC(2026, 9, 13));
    planMeal.findMany.mockResolvedValue([
      { date: new Date(Date.UTC(2026, 9, 13)) },
      { date: new Date(Date.UTC(2026, 9, 20)) },
    ]);

    await expect(
      listPlansForSlot(testUser.id, "meal-slot-1", from),
    ).resolves.toEqual(["2026-10-13", "2026-10-20"]);
    expect(planMeal.findMany).toHaveBeenCalledWith({
      where: {
        userId: testUser.id,
        mealSlotId: "meal-slot-1",
        date: { gte: from },
      },
      select: { date: true },
      orderBy: { date: "asc" },
    });
  });
});
