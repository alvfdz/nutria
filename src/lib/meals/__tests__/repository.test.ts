import { connection } from "next/server";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { UnknownIngredientError } from "@/lib/meals/errors";
import {
  createMeal,
  deleteMeal,
  listMeals,
  updateMeal,
} from "@/lib/meals/repository";
import { ingredientDefaults, mealDefaults } from "@test/factories";

// Same hand-rolled Prisma stub as the ingredients suite: the suite stays fast
// and needs no PostgreSQL container, and every assertion is on the call shape
// the repository sends to the database.
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ getPrisma: vi.fn() }));

const meal = {
  create: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const input = { ...mealDefaults };

/** The read shape every meal query embeds: ordered items + their ingredient. */
const include = {
  items: { include: { ingredient: true }, orderBy: { sortOrder: "asc" } },
};

const mealCreatedAt = new Date("2026-05-04T10:20:30.000Z");
const ingredientCreatedAt = new Date("2026-01-02T03:04:05.678Z");

const OATS_ID = "9f1c1f9e-0000-4000-8000-000000000001";

/** A row as a write returns it: `Date` timestamps and the embedded ingredient. */
function dbRow() {
  return {
    id: "meal-1",
    name: input.name,
    createdAt: mealCreatedAt,
    items: [
      {
        id: "item-1",
        grams: 80,
        sortOrder: 0,
        mealId: "meal-1",
        ingredientId: OATS_ID,
        ingredient: {
          id: OATS_ID,
          ...ingredientDefaults,
          createdAt: ingredientCreatedAt,
        },
      },
    ],
  };
}

/** The same row after `toMeal`: timestamps as ISO 8601 strings. */
function mappedRow() {
  const row = dbRow();

  return {
    ...row,
    createdAt: "2026-05-04T10:20:30.000Z",
    items: row.items.map((item) => ({
      ...item,
      ingredient: { ...item.ingredient, createdAt: "2026-01-02T03:04:05.678Z" },
    })),
  };
}

/**
 * Builds the `P2025` Prisma throws when `where` matches no row.
 *
 * @param message Text Prisma would attach to the failure.
 */
function notFound(message: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(message, {
    code: "P2025",
    clientVersion: "7.10.0",
  });
}

/**
 * Builds the `P2003` Prisma throws when a row references a missing record.
 *
 * @param message Text Prisma would attach to the failure.
 */
function foreignKey(message: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(message, {
    code: "P2003",
    clientVersion: "7.10.0",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPrisma).mockReturnValue({ meal } as unknown as ReturnType<
    typeof getPrisma
  >);
  vi.mocked(connection).mockResolvedValue(undefined);
});

describe("createMeal", () => {
  test("writes nested items.create with positional sortOrder and the read include", async () => {
    meal.create.mockResolvedValue(dbRow());

    await createMeal(input);

    expect(meal.create).toHaveBeenCalledWith({
      data: {
        name: input.name,
        items: {
          create: [
            { ingredientId: OATS_ID, grams: 80, sortOrder: 0 },
            {
              ingredientId: "9f1c1f9e-0000-4000-8000-000000000002",
              grams: 200,
              sortOrder: 1,
            },
          ],
        },
      },
      include,
    });
  });

  test("renders the meal and its embedded ingredient timestamps as ISO strings", async () => {
    meal.create.mockResolvedValue(dbRow());

    const created = await createMeal(input);

    expect(created).toEqual(mappedRow());
    expect(typeof created.createdAt).toBe("string");
    expect(typeof created.items[0]?.ingredient.createdAt).toBe("string");
  });

  test("translates a foreign-key violation into an unknown ingredient", async () => {
    meal.create.mockRejectedValue(
      foreignKey("Foreign key constraint failed on the field: ingredientId"),
    );

    await expect(createMeal(input)).rejects.toBeInstanceOf(
      UnknownIngredientError,
    );
  });

  test("rethrows any other failure as is", async () => {
    const failure = new Error("connection terminated");
    meal.create.mockRejectedValue(failure);

    await expect(createMeal(input)).rejects.toBe(failure);
  });
});

describe("listMeals", () => {
  test("awaits connection() before querying so the read stays per request", async () => {
    meal.findMany.mockResolvedValue([]);

    await listMeals();

    expect(connection).toHaveBeenCalledOnce();
    expect(connection).toHaveBeenCalledBefore(meal.findMany);
  });

  test("asks for the ordered items with their ingredients, newest meal first", async () => {
    meal.findMany.mockResolvedValue([]);

    await listMeals();

    expect(meal.findMany).toHaveBeenCalledWith({
      include,
      orderBy: { createdAt: "desc" },
    });
  });

  test("maps every row with ISO timestamps, in the order the database gave", async () => {
    meal.findMany.mockResolvedValue([
      dbRow(),
      {
        ...dbRow(),
        id: "meal-2",
        name: "Cod bowl",
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
      },
    ]);

    const listed = await listMeals();

    expect(listed).toEqual([
      mappedRow(),
      {
        ...mappedRow(),
        id: "meal-2",
        name: "Cod bowl",
        createdAt: "2026-03-01T00:00:00.000Z",
      },
    ]);
  });
});

describe("updateMeal", () => {
  test("addresses the meal by id and replaces its items with positional sortOrder", async () => {
    meal.update.mockResolvedValue(dbRow());

    await updateMeal("meal-1", input);

    expect(meal.update).toHaveBeenCalledWith({
      where: { id: "meal-1" },
      data: {
        name: input.name,
        items: {
          deleteMany: {},
          create: [
            { ingredientId: OATS_ID, grams: 80, sortOrder: 0 },
            {
              ingredientId: "9f1c1f9e-0000-4000-8000-000000000002",
              grams: 200,
              sortOrder: 1,
            },
          ],
        },
      },
      include,
    });
  });

  test("names the meal when Prisma reports it missing", async () => {
    meal.update.mockRejectedValue(
      notFound(
        "An operation failed because it depends on one or more records that were required but not found.",
      ),
    );

    await expect(updateMeal("missing", input)).rejects.toThrow(
      "Unknown meal: missing",
    );
  });

  test("translates a foreign-key violation into an unknown ingredient", async () => {
    meal.update.mockRejectedValue(
      foreignKey("Foreign key constraint failed on the field: ingredientId"),
    );

    await expect(updateMeal("meal-1", input)).rejects.toBeInstanceOf(
      UnknownIngredientError,
    );
  });

  test("rethrows any other error as is", async () => {
    const failure = new Prisma.PrismaClientKnownRequestError("value too long", {
      code: "P2000",
      clientVersion: "7.10.0",
    });
    meal.update.mockRejectedValue(failure);

    await expect(updateMeal("meal-1", input)).rejects.toBe(failure);
  });
});

describe("deleteMeal", () => {
  test("removes the meal addressed by id", async () => {
    meal.delete.mockResolvedValue({ id: "meal-1" });

    await deleteMeal("meal-1");

    expect(meal.delete).toHaveBeenCalledWith({ where: { id: "meal-1" } });
  });

  test("names the meal when Prisma reports it missing", async () => {
    meal.delete.mockRejectedValue(notFound("Record to delete does not exist."));

    await expect(deleteMeal("missing")).rejects.toThrow(
      "Unknown meal: missing",
    );
  });

  test("rethrows a non-Prisma error as is", async () => {
    const failure = new Error("connection terminated");
    meal.delete.mockRejectedValue(failure);

    await expect(deleteMeal("meal-1")).rejects.toBe(failure);
  });
});
