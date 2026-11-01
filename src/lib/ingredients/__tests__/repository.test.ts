import { connection } from "next/server";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { IngredientInUseError } from "@/lib/ingredients/errors";
import {
  createIngredient,
  deleteIngredient,
  getIngredientUsage,
  listIngredients,
  updateIngredient,
} from "@/lib/ingredients/repository";
import { ingredientDefaults, testUser } from "@test/factories";

// The suite runs against a hand-rolled Prisma stub so it stays fast and needs
// no PostgreSQL container. Only the model methods the repository touches are
// faked; every assertion is on the call shape it sends to the database.
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ getPrisma: vi.fn() }));

const ingredient = {
  create: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

// The deletion guard counts a meal's rows before touching the ingredient.
const mealItem = {
  count: vi.fn(),
  findMany: vi.fn(),
};

const input = { ...ingredientDefaults };

/** Owner every call is scoped to. */
const userId = testUser.id;

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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPrisma).mockReturnValue({
    ingredient,
    mealItem,
  } as unknown as ReturnType<typeof getPrisma>);
  vi.mocked(connection).mockResolvedValue(undefined);
  // Nothing references the ingredient unless a test says otherwise.
  mealItem.count.mockResolvedValue(0);
});

describe("createIngredient", () => {
  test("writes the input with its owner and lets the database stamp the row", async () => {
    const createdAt = new Date("2026-05-04T10:20:30.000Z");
    ingredient.create.mockResolvedValue({
      id: "9f1c1f9e-0000-4000-8000-000000000001",
      createdAt,
      userId,
      ...input,
    });

    const created = await createIngredient(userId, input);

    expect(ingredient.create).toHaveBeenCalledWith({
      data: { ...input, userId },
    });
    expect(created).toEqual({
      ...input,
      id: "9f1c1f9e-0000-4000-8000-000000000001",
      createdAt: "2026-05-04T10:20:30.000Z",
    });
  });

  test("renders createdAt as an ISO string rather than a Date", async () => {
    ingredient.create.mockResolvedValue({
      id: "id",
      createdAt: new Date("2026-01-02T03:04:05.678Z"),
      ...input,
    });

    const created = await createIngredient(userId, input);

    expect(typeof created.createdAt).toBe("string");
  });

  test("lets a database failure through untouched", async () => {
    const failure = notFound("some other code path");
    ingredient.create.mockRejectedValue(failure);

    await expect(createIngredient(userId, input)).rejects.toBe(failure);
  });
});

describe("getIngredientUsage", () => {
  test("waits for connection() so the route renders per request", async () => {
    mealItem.findMany.mockResolvedValue([]);

    await getIngredientUsage(userId);

    expect(connection).toHaveBeenCalled();
  });

  test("asks for the user's own ingredients, once per meal, A to Z", async () => {
    mealItem.findMany.mockResolvedValue([]);

    await getIngredientUsage(userId);

    expect(mealItem.findMany).toHaveBeenCalledWith({
      where: { ingredient: { userId } },
      select: { ingredientId: true, meal: { select: { name: true } } },
      distinct: ["ingredientId", "mealId"],
      orderBy: { meal: { name: "asc" } },
    });
  });

  test("groups the meal names by ingredient", async () => {
    mealItem.findMany.mockResolvedValue([
      { ingredientId: "oats", meal: { name: "Granola" } },
      { ingredientId: "milk", meal: { name: "Latte" } },
      { ingredientId: "oats", meal: { name: "Porridge" } },
    ]);

    await expect(getIngredientUsage(userId)).resolves.toEqual({
      oats: ["Granola", "Porridge"],
      milk: ["Latte"],
    });
  });

  test("returns nothing when no meal uses an ingredient", async () => {
    mealItem.findMany.mockResolvedValue([]);

    await expect(getIngredientUsage(userId)).resolves.toEqual({});
  });
});

describe("listIngredients", () => {
  test("waits for connection() so the route renders per request", async () => {
    ingredient.findMany.mockResolvedValue([]);

    await listIngredients(userId);

    expect(connection).toHaveBeenCalledOnce();
  });

  test("asks for the user's ingredients only, newest first", async () => {
    ingredient.findMany.mockResolvedValue([]);

    await listIngredients(userId);

    expect(ingredient.findMany).toHaveBeenCalledWith({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  });

  test("maps every row, without its owner, in the order the database gave", async () => {
    ingredient.findMany.mockResolvedValue([
      {
        id: "newest",
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        userId,
        ...input,
        name: "Oats",
      },
      {
        id: "oldest",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        userId,
        ...input,
        name: "Cod",
      },
    ]);

    const listed = await listIngredients(userId);

    expect(listed).toEqual([
      {
        ...input,
        id: "newest",
        name: "Oats",
        createdAt: "2026-03-01T00:00:00.000Z",
      },
      {
        ...input,
        id: "oldest",
        name: "Cod",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });
});

describe("updateIngredient", () => {
  test("addresses the user's row by id and replaces the editable fields", async () => {
    const edited = { ...input, name: "Cooked chicken" };
    ingredient.update.mockResolvedValue({
      id: "cod",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      ...edited,
    });

    const updated = await updateIngredient(userId, "cod", edited);

    expect(ingredient.update).toHaveBeenCalledWith({
      where: { id: "cod", userId },
      data: edited,
    });
    expect(updated).toEqual({
      ...edited,
      id: "cod",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  test("translates the missing-row error into an unknown ingredient", async () => {
    ingredient.update.mockRejectedValue(
      notFound(
        "An operation failed because it depends on one or more records that were required but not found.",
      ),
    );

    await expect(updateIngredient(userId, "missing", input)).rejects.toThrow(
      "Unknown ingredient: missing",
    );
  });

  test("treats another user's ingredient as unknown", async () => {
    ingredient.update.mockRejectedValue(notFound("No record was found."));

    await expect(
      updateIngredient("someone-else", "theirs", input),
    ).rejects.toThrow("Unknown ingredient: theirs");
    expect(ingredient.update).toHaveBeenCalledWith({
      where: { id: "theirs", userId: "someone-else" },
      data: input,
    });
  });

  test("rethrows any other Prisma error as is", async () => {
    const failure = new Prisma.PrismaClientKnownRequestError("too long", {
      code: "P2000",
      clientVersion: "7.10.0",
    });
    ingredient.update.mockRejectedValue(failure);

    await expect(updateIngredient(userId, "cod", input)).rejects.toBe(failure);
  });
});

describe("deleteIngredient", () => {
  test("removes the row addressed by id", async () => {
    ingredient.delete.mockResolvedValue({ id: "cod", ...input });

    await deleteIngredient(userId, "cod");

    expect(ingredient.delete).toHaveBeenCalledWith({
      where: { id: "cod", userId },
    });
  });

  test("deletes normally when no meal references the ingredient", async () => {
    mealItem.count.mockResolvedValue(0);
    ingredient.delete.mockResolvedValue({ id: "cod", ...input });

    await deleteIngredient(userId, "cod");

    expect(mealItem.count).toHaveBeenCalledWith({
      where: { ingredientId: "cod", ingredient: { userId } },
    });
    expect(ingredient.delete).toHaveBeenCalledWith({
      where: { id: "cod", userId },
    });
  });

  test("counts references through the ingredient's owner, whoever owns the meal", async () => {
    await deleteIngredient(userId, "cod");

    expect(mealItem.count).toHaveBeenCalledWith({
      where: { ingredientId: "cod", ingredient: { userId } },
    });
  });

  test("refuses to delete an ingredient meals still reference", async () => {
    mealItem.count.mockResolvedValue(3);

    const deletion = deleteIngredient(userId, "cod");

    await expect(deletion).rejects.toBeInstanceOf(IngredientInUseError);
    await expect(deletion).rejects.toMatchObject({ mealCount: 3 });
    expect(ingredient.delete).not.toHaveBeenCalled();
  });

  test("translates the missing-row error into an unknown ingredient", async () => {
    ingredient.delete.mockRejectedValue(
      notFound("Record to delete does not exist."),
    );

    await expect(deleteIngredient(userId, "missing")).rejects.toThrow(
      "Unknown ingredient: missing",
    );
  });

  test("treats another user's ingredient as unknown", async () => {
    ingredient.delete.mockRejectedValue(
      notFound("Record to delete does not exist."),
    );

    await expect(deleteIngredient("someone-else", "theirs")).rejects.toThrow(
      "Unknown ingredient: theirs",
    );
    expect(ingredient.delete).toHaveBeenCalledWith({
      where: { id: "theirs", userId: "someone-else" },
    });
  });

  test("rethrows a non-Prisma error as is", async () => {
    const failure = new Error("connection terminated");
    ingredient.delete.mockRejectedValue(failure);

    await expect(deleteIngredient(userId, "cod")).rejects.toBe(failure);
  });
});
