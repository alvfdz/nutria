import { connection } from "next/server";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { SlotInUseError } from "@/lib/goals/errors";
import { getGoals, saveGoals } from "@/lib/goals/repository";
import type { NewGoals } from "@/lib/goals/types";
import { goalsDefaults, testUser } from "@test/factories";

// Same hand-rolled Prisma stub as the ingredients and meals suites: the suite
// stays fast and needs no PostgreSQL container, and every assertion is on the
// call shape the repository sends to the database.
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ getPrisma: vi.fn() }));

const goals = {
  findUnique: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

const mealSlot = {
  update: vi.fn(),
  deleteMany: vi.fn(),
  create: vi.fn(),
};

const planMeal = { findMany: vi.fn() };

/** The object the interactive transaction hands back to its callback. */
const tx = { goals, mealSlot };

const prisma = {
  goals,
  mealSlot,
  planMeal,
  $transaction: vi.fn(),
};

/** The read shape every goals query embeds: slots in dining order. */
const include = { slots: { orderBy: { sortOrder: "asc" } } };

const goalsCreatedAt = new Date("2026-05-04T10:20:30.000Z");
const goalsUpdatedAt = new Date("2026-05-04T11:00:00.000Z");

/** The three stored slots, ids stable across renames and reorders. */
function dbSlots() {
  return [
    {
      id: "meal-slot-1",
      name: "Breakfast",
      percent: 30,
      sortOrder: 0,
      goalsId: "goals-1",
    },
    {
      id: "meal-slot-2",
      name: "Lunch",
      percent: 40,
      sortOrder: 1,
      goalsId: "goals-1",
    },
    {
      id: "meal-slot-3",
      name: "Dinner",
      percent: 30,
      sortOrder: 2,
      goalsId: "goals-1",
    },
  ];
}

/** A row as a write returns it: `Date` timestamps and the embedded slots. */
function dbRow() {
  return {
    id: "goals-1",
    userId: testUser.id,
    calories: goalsDefaults.calories,
    proteinPct: goalsDefaults.proteinPct,
    carbsPct: goalsDefaults.carbsPct,
    fatPct: goalsDefaults.fatPct,
    createdAt: goalsCreatedAt,
    updatedAt: goalsUpdatedAt,
    slots: dbSlots(),
  };
}

/**
 * The same row after `toGoals`: timestamps as ISO 8601 strings, and the
 * owning `userId` dropped.
 */
function mappedRow() {
  const row = dbRow();

  return {
    id: row.id,
    ...budgetData(),
    createdAt: goalsCreatedAt.toISOString(),
    updatedAt: goalsUpdatedAt.toISOString(),
    slots: row.slots,
  };
}

/** The nested slot rows the first save sends on a create. */
function slotsToCreate() {
  return goalsDefaults.slots.map((slot, index) => ({
    name: slot.name,
    percent: slot.percent,
    sortOrder: index,
  }));
}

/** The scalar budget fields every write sends. */
function budgetData() {
  return {
    calories: goalsDefaults.calories,
    proteinPct: goalsDefaults.proteinPct,
    carbsPct: goalsDefaults.carbsPct,
    fatPct: goalsDefaults.fatPct,
  };
}

/** A submission referencing the three stored slots by id. */
function updateInput(slots: NewGoals["slots"]): NewGoals {
  return { ...budgetData(), slots };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPrisma).mockReturnValue(
    prisma as unknown as ReturnType<typeof getPrisma>,
  );
  vi.mocked(connection).mockResolvedValue(undefined);
  prisma.$transaction.mockImplementation(async (callback) => callback(tx));
  goals.findUniqueOrThrow.mockResolvedValue(dbRow());
  planMeal.findMany.mockResolvedValue([]);
});

describe("getGoals", () => {
  test("awaits connection() before querying so the read stays per request", async () => {
    goals.findUnique.mockResolvedValue(null);

    await getGoals(testUser.id);

    expect(connection).toHaveBeenCalledOnce();
    expect(connection).toHaveBeenCalledBefore(goals.findUnique);
  });

  test("asks for the ordered slots", async () => {
    goals.findUnique.mockResolvedValue(null);

    await getGoals(testUser.id);

    expect(goals.findUnique).toHaveBeenCalledWith({
      where: { userId: testUser.id },
      include,
    });
  });

  test("returns null when nothing has been saved yet", async () => {
    goals.findUnique.mockResolvedValue(null);

    await expect(getGoals(testUser.id)).resolves.toBeNull();
  });

  test("maps the row with ISO timestamps and the database's slot order", async () => {
    goals.findUnique.mockResolvedValue(dbRow());

    await expect(getGoals(testUser.id)).resolves.toEqual(mappedRow());
  });
});

describe("saveGoals: first save", () => {
  test("creates the row with the slots stamped with positional sortOrder", async () => {
    goals.findUnique.mockResolvedValue(null);
    goals.create.mockResolvedValue(dbRow());

    await saveGoals(testUser.id, goalsDefaults);

    expect(goals.findUnique).toHaveBeenCalledWith({
      where: { userId: testUser.id },
      include: { slots: true },
    });
    expect(goals.create).toHaveBeenCalledWith({
      data: {
        userId: testUser.id,
        ...budgetData(),
        slots: { create: slotsToCreate() },
      },
      include,
    });
    expect(goals.update).not.toHaveBeenCalled();
  });

  test("returns the stored row with ISO timestamps", async () => {
    goals.findUnique.mockResolvedValue(null);
    goals.create.mockResolvedValue(dbRow());

    await expect(saveGoals(testUser.id, goalsDefaults)).resolves.toEqual(
      mappedRow(),
    );
  });
});

describe("saveGoals: racing first saves", () => {
  test("retries as an update when a concurrent save created the row first", async () => {
    goals.findUnique.mockResolvedValueOnce(null).mockResolvedValue(dbRow());
    goals.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "7.10.1",
      }),
    );
    goals.findUniqueOrThrow.mockResolvedValue(dbRow());

    await expect(saveGoals(testUser.id, goalsDefaults)).resolves.toEqual(
      mappedRow(),
    );
    expect(goals.create).toHaveBeenCalledTimes(1);
    expect(goals.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "goals-1" } }),
    );
  });

  test("lets any other create failure through", async () => {
    const failure = new Prisma.PrismaClientKnownRequestError("too long", {
      code: "P2000",
      clientVersion: "7.10.1",
    });
    goals.findUnique.mockResolvedValue(null);
    goals.create.mockRejectedValue(failure);

    await expect(saveGoals(testUser.id, goalsDefaults)).rejects.toBe(failure);
    expect(goals.findUnique).toHaveBeenCalledTimes(1);
  });
});

describe("saveGoals: later saves reconcile by id", () => {
  test("updates the budget and reorders existing slots without deleting them", async () => {
    goals.findUnique.mockResolvedValue(dbRow());

    await saveGoals(
      testUser.id,
      updateInput([
        { slotId: "meal-slot-2", name: "Lunch", percent: 40 },
        { slotId: "meal-slot-1", name: "Breakfast", percent: 30 },
        { slotId: "meal-slot-3", name: "Dinner", percent: 30 },
      ]),
    );

    expect(goals.update).toHaveBeenCalledWith({
      where: { id: "goals-1" },
      data: budgetData(),
    });
    expect(mealSlot.deleteMany).not.toHaveBeenCalled();
    expect(mealSlot.create).not.toHaveBeenCalled();

    // Two-pass: negative temporary positions first, then the final order.
    expect(mealSlot.update).toHaveBeenNthCalledWith(1, {
      where: { id: "meal-slot-2" },
      data: { sortOrder: -1 },
    });
    expect(mealSlot.update).toHaveBeenNthCalledWith(2, {
      where: { id: "meal-slot-1" },
      data: { sortOrder: -2 },
    });
    expect(mealSlot.update).toHaveBeenNthCalledWith(3, {
      where: { id: "meal-slot-3" },
      data: { sortOrder: -3 },
    });
    expect(mealSlot.update).toHaveBeenNthCalledWith(4, {
      where: { id: "meal-slot-2" },
      data: { name: "Lunch", percent: 40, sortOrder: 0 },
    });
    expect(mealSlot.update).toHaveBeenNthCalledWith(5, {
      where: { id: "meal-slot-1" },
      data: { name: "Breakfast", percent: 30, sortOrder: 1 },
    });
    expect(mealSlot.update).toHaveBeenNthCalledWith(6, {
      where: { id: "meal-slot-3" },
      data: { name: "Dinner", percent: 30, sortOrder: 2 },
    });

    expect(goals.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { userId: testUser.id },
      include,
    });
  });

  test("creates a slot that arrives without an id", async () => {
    goals.findUnique.mockResolvedValue(dbRow());

    await saveGoals(
      testUser.id,
      updateInput([
        { slotId: "meal-slot-1", name: "Breakfast", percent: 30 },
        { slotId: "meal-slot-2", name: "Lunch", percent: 35 },
        { slotId: "meal-slot-3", name: "Dinner", percent: 25 },
        { name: "Snack", percent: 10 },
      ]),
    );

    expect(mealSlot.create).toHaveBeenCalledWith({
      data: {
        name: "Snack",
        percent: 10,
        sortOrder: 3,
        goalsId: "goals-1",
      },
    });
  });

  test("deletes a removed slot once it has no forward plans", async () => {
    goals.findUnique.mockResolvedValue(dbRow());
    planMeal.findMany.mockResolvedValue([]);

    await saveGoals(
      testUser.id,
      updateInput([
        { slotId: "meal-slot-1", name: "Breakfast", percent: 50 },
        { slotId: "meal-slot-2", name: "Lunch", percent: 50 },
      ]),
    );

    expect(planMeal.findMany).toHaveBeenCalledWith({
      where: {
        userId: testUser.id,
        mealSlotId: "meal-slot-3",
        date: { gte: expect.any(Date) },
      },
      select: { date: true },
      orderBy: { date: "asc" },
    });
    expect(mealSlot.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["meal-slot-3"] } },
    });
  });

  test("refuses to delete a slot that still has a forward plan", async () => {
    goals.findUnique.mockResolvedValue(dbRow());
    planMeal.findMany.mockResolvedValue([
      { date: new Date(Date.UTC(2026, 9, 20)) },
    ]);

    const failure = await saveGoals(
      testUser.id,
      updateInput([
        { slotId: "meal-slot-1", name: "Breakfast", percent: 50 },
        { slotId: "meal-slot-2", name: "Lunch", percent: 50 },
      ]),
    ).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(SlotInUseError);
    expect((failure as SlotInUseError).slotName).toBe("Dinner");
    expect((failure as SlotInUseError).dayKeys).toEqual(["2026-10-20"]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test("lets a database failure through untouched", async () => {
    const failure = new Error("connection terminated");
    goals.findUnique.mockResolvedValue(dbRow());
    prisma.$transaction.mockRejectedValue(failure);

    await expect(saveGoals(testUser.id, updateInput([]))).rejects.toBe(failure);
  });

  test("returns the updated row with ISO timestamps", async () => {
    goals.findUnique.mockResolvedValue(dbRow());

    await expect(
      saveGoals(
        testUser.id,
        updateInput([
          { slotId: "meal-slot-1", name: "Breakfast", percent: 30 },
          { slotId: "meal-slot-2", name: "Lunch", percent: 40 },
          { slotId: "meal-slot-3", name: "Dinner", percent: 30 },
        ]),
      ),
    ).resolves.toEqual(mappedRow());
  });
});
