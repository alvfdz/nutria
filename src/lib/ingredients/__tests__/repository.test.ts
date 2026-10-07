import { connection } from "next/server";

import { beforeEach, describe, expect, test, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { IngredientInUseError } from "@/lib/ingredients/errors";
import {
  createIngredient,
  deleteIngredient,
  listIngredients,
  updateIngredient,
} from "@/lib/ingredients/repository";
import { ingredientDefaults } from "@test/factories";

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
};

const input = { ...ingredientDefaults };

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
  test("writes the input untouched and lets the database stamp the row", async () => {
    const createdAt = new Date("2026-05-04T10:20:30.000Z");
    ingredient.create.mockResolvedValue({
      id: "9f1c1f9e-0000-4000-8000-000000000001",
      createdAt,
      ...input,
    });

    const created = await createIngredient(input);

    expect(ingredient.create).toHaveBeenCalledWith({ data: input });
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

    const created = await createIngredient(input);

    expect(typeof created.createdAt).toBe("string");
  });

  test("lets a database failure through untouched", async () => {
    const failure = notFound("some other code path");
    ingredient.create.mockRejectedValue(failure);

    await expect(createIngredient(input)).rejects.toBe(failure);
  });
});

describe("listIngredients", () => {
  test("waits for connection() so the route renders per request", async () => {
    ingredient.findMany.mockResolvedValue([]);

    await listIngredients();

    expect(connection).toHaveBeenCalledOnce();
  });

  test("asks for every ingredient newest first", async () => {
    ingredient.findMany.mockResolvedValue([]);

    await listIngredients();

    expect(ingredient.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
  });

  test("maps every row and hands back the order the database gave", async () => {
    ingredient.findMany.mockResolvedValue([
      {
        id: "newest",
        createdAt: new Date("2026-03-01T00:00:00.000Z"),
        ...input,
        name: "Oats",
      },
      {
        id: "oldest",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        ...input,
        name: "Cod",
      },
    ]);

    const listed = await listIngredients();

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
  test("addresses the row by id and replaces the editable fields", async () => {
    const edited = { ...input, name: "Cooked chicken" };
    ingredient.update.mockResolvedValue({
      id: "cod",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      ...edited,
    });

    const updated = await updateIngredient("cod", edited);

    expect(ingredient.update).toHaveBeenCalledWith({
      where: { id: "cod" },
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

    await expect(updateIngredient("missing", input)).rejects.toThrow(
      "Unknown ingredient: missing",
    );
  });

  test("rethrows any other Prisma error as is", async () => {
    const failure = new Prisma.PrismaClientKnownRequestError("too long", {
      code: "P2000",
      clientVersion: "7.10.0",
    });
    ingredient.update.mockRejectedValue(failure);

    await expect(updateIngredient("cod", input)).rejects.toBe(failure);
  });
});

describe("deleteIngredient", () => {
  test("removes the row addressed by id", async () => {
    ingredient.delete.mockResolvedValue({ id: "cod", ...input });

    await deleteIngredient("cod");

    expect(ingredient.delete).toHaveBeenCalledWith({ where: { id: "cod" } });
  });

  test("deletes normally when no meal references the ingredient", async () => {
    mealItem.count.mockResolvedValue(0);
    ingredient.delete.mockResolvedValue({ id: "cod", ...input });

    await deleteIngredient("cod");

    expect(mealItem.count).toHaveBeenCalledWith({
      where: { ingredientId: "cod" },
    });
    expect(ingredient.delete).toHaveBeenCalledWith({ where: { id: "cod" } });
  });

  test("counts only the meal rows that reference the given ingredient", async () => {
    await deleteIngredient("cod");

    expect(mealItem.count).toHaveBeenCalledWith({
      where: { ingredientId: "cod" },
    });
  });

  test("refuses to delete an ingredient meals still reference", async () => {
    mealItem.count.mockResolvedValue(3);

    const deletion = deleteIngredient("cod");

    await expect(deletion).rejects.toBeInstanceOf(IngredientInUseError);
    await expect(deletion).rejects.toMatchObject({ mealCount: 3 });
    expect(ingredient.delete).not.toHaveBeenCalled();
  });

  test("translates the missing-row error into an unknown ingredient", async () => {
    ingredient.delete.mockRejectedValue(
      notFound("Record to delete does not exist."),
    );

    await expect(deleteIngredient("missing")).rejects.toThrow(
      "Unknown ingredient: missing",
    );
  });

  test("rethrows a non-Prisma error as is", async () => {
    const failure = new Error("connection terminated");
    ingredient.delete.mockRejectedValue(failure);

    await expect(deleteIngredient("cod")).rejects.toBe(failure);
  });
});
