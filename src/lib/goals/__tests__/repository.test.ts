import { connection } from "next/server";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { getPrisma } from "@/lib/db/prisma";
import { getGoals, saveGoals } from "@/lib/goals/repository";
import { goalsDefaults } from "@test/factories";

// Same hand-rolled Prisma stub as the ingredients and meals suites: the suite
// stays fast and needs no PostgreSQL container, and every assertion is on the
// call shape the repository sends to the database.
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ getPrisma: vi.fn() }));

const goals = {
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
};

/** The read shape every goals query embeds: slots in dining order. */
const include = { slots: { orderBy: { sortOrder: "asc" } } };

const goalsCreatedAt = new Date("2026-05-04T10:20:30.000Z");
const goalsUpdatedAt = new Date("2026-05-04T11:00:00.000Z");

/** A row as a write returns it: `Date` timestamps and the embedded slots. */
function dbRow() {
  return {
    id: "goals-1",
    ...goalsDefaults,
    createdAt: goalsCreatedAt,
    updatedAt: goalsUpdatedAt,
    slots: goalsDefaults.slots.map((slot, index) => ({
      ...slot,
      id: `meal-slot-${index + 1}`,
      sortOrder: index,
      goalsId: "goals-1",
    })),
  };
}

/** The same row after `toGoals`: timestamps as ISO 8601 strings. */
function mappedRow() {
  const row = dbRow();

  return {
    ...row,
    createdAt: goalsCreatedAt.toISOString(),
    updatedAt: goalsUpdatedAt.toISOString(),
  };
}

/** The nested slot rows `saveGoals` sends on a write. */
function slotsToCreate() {
  return goalsDefaults.slots.map((slot, index) => ({
    ...slot,
    sortOrder: index,
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPrisma).mockReturnValue({ goals } as unknown as ReturnType<
    typeof getPrisma
  >);
  vi.mocked(connection).mockResolvedValue(undefined);
});

describe("getGoals", () => {
  test("awaits connection() before querying so the read stays per request", async () => {
    goals.findFirst.mockResolvedValue(null);

    await getGoals();

    expect(connection).toHaveBeenCalledOnce();
    expect(connection).toHaveBeenCalledBefore(goals.findFirst);
  });

  test("asks for the ordered slots", async () => {
    goals.findFirst.mockResolvedValue(null);

    await getGoals();

    expect(goals.findFirst).toHaveBeenCalledWith({ include });
  });

  test("returns null when nothing has been saved yet", async () => {
    goals.findFirst.mockResolvedValue(null);

    await expect(getGoals()).resolves.toBeNull();
  });

  test("maps the row with ISO timestamps and the database's slot order", async () => {
    goals.findFirst.mockResolvedValue(dbRow());

    await expect(getGoals()).resolves.toEqual(mappedRow());
  });
});

describe("saveGoals: first save", () => {
  test("creates the row with the slots stamped with positional sortOrder", async () => {
    goals.findFirst.mockResolvedValue(null);
    goals.create.mockResolvedValue(dbRow());

    await saveGoals(goalsDefaults);

    expect(goals.findFirst).toHaveBeenCalledWith({ select: { id: true } });
    expect(goals.create).toHaveBeenCalledWith({
      data: {
        calories: goalsDefaults.calories,
        proteinPct: goalsDefaults.proteinPct,
        carbsPct: goalsDefaults.carbsPct,
        fatPct: goalsDefaults.fatPct,
        slots: { create: slotsToCreate() },
      },
      include,
    });
    expect(goals.update).not.toHaveBeenCalled();
  });

  test("returns the stored row with ISO timestamps", async () => {
    goals.findFirst.mockResolvedValue(null);
    goals.create.mockResolvedValue(dbRow());

    await expect(saveGoals(goalsDefaults)).resolves.toEqual(mappedRow());
  });
});

describe("saveGoals: later saves", () => {
  test("updates the existing row, replacing its slots", async () => {
    goals.findFirst.mockResolvedValue({ id: "goals-1" });
    goals.update.mockResolvedValue(dbRow());

    await saveGoals({ ...goalsDefaults, calories: 2200 });

    expect(goals.update).toHaveBeenCalledWith({
      where: { id: "goals-1" },
      data: {
        calories: 2200,
        proteinPct: goalsDefaults.proteinPct,
        carbsPct: goalsDefaults.carbsPct,
        fatPct: goalsDefaults.fatPct,
        slots: {
          deleteMany: {},
          create: slotsToCreate(),
        },
      },
      include,
    });
    expect(goals.create).not.toHaveBeenCalled();
  });

  test("returns the updated row with ISO timestamps", async () => {
    goals.findFirst.mockResolvedValue({ id: "goals-1" });
    goals.update.mockResolvedValue(dbRow());

    await expect(saveGoals(goalsDefaults)).resolves.toEqual(mappedRow());
  });

  test("lets a database failure through untouched", async () => {
    const failure = new Error("connection terminated");
    goals.findFirst.mockResolvedValue({ id: "goals-1" });
    goals.update.mockRejectedValue(failure);

    await expect(saveGoals(goalsDefaults)).rejects.toBe(failure);
  });
});
