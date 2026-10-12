import "server-only";

import { connection } from "next/server";

import {
  type Goals as GoalsDbRow,
  type MealSlot as MealSlotDbRow,
} from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import type { Goals, NewGoals } from "./types";

/** A goals row as reads ask for it: its slots, in dining order. */
type GoalsWithSlots = GoalsDbRow & { slots: MealSlotDbRow[] };

/**
 * What every goals read embeds: the day's meals, delivered in dining order so
 * the form and future planner can render them without re-sorting.
 */
const goalsInclude = {
  slots: { orderBy: { sortOrder: "asc" as const } },
};

/**
 * Stamps a Prisma row as a {@link Goals}. Prisma returns every timestamp as a
 * `Date`, which the domain types carry as ISO 8601 strings.
 *
 * @param row The row as Prisma returns it.
 * @returns The same row in the shape the app uses.
 */
function toGoals(row: GoalsWithSlots): Goals {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** The scalar budget fields shared by the create and update write shapes. */
function budgetData(input: NewGoals) {
  return {
    calories: input.calories,
    proteinPct: input.proteinPct,
    carbsPct: input.carbsPct,
    fatPct: input.fatPct,
  };
}

/**
 * Turns validated slots into the nested `create` array, stamping each row's
 * position in the dining order.
 *
 * @param slots The submitted meal slots, in order.
 * @returns The rows Prisma should create under the goals row.
 */
function slotsToCreate(input: NewGoals["slots"]) {
  return input.map((slot, index) => ({ ...slot, sortOrder: index }));
}

/**
 * Loads the single goals row with its ordered slots, if one exists yet.
 *
 * @returns The stored goals, or `null` when nothing has been saved.
 */
export async function getGoals(): Promise<Goals | null> {
  // Nothing else in this read touches Request-time APIs, so without this the
  // query would run while prerendering and get frozen into the build output.
  await connection();

  const row = await getPrisma().goals.findFirst({ include: goalsInclude });

  return row ? toGoals(row) : null;
}

/**
 * Stores the daily goals. Single-tenant as the ingredients/meals stores: the
 * first save creates the row, every later save updates it in place and
 * replaces the slots with the submitted ones. Prisma runs the nested
 * `deleteMany` + `create` inside one transaction, so a failure leaves the
 * previous slots in place rather than half-updated.
 *
 * @param input Validated budget and meal slots.
 * @returns The stored goals, slots ordered.
 */
export async function saveGoals(input: NewGoals): Promise<Goals> {
  const existing = await getPrisma().goals.findFirst({
    select: { id: true },
  });

  if (existing) {
    const row = await getPrisma().goals.update({
      where: { id: existing.id },
      data: {
        ...budgetData(input),
        slots: {
          deleteMany: {},
          create: slotsToCreate(input.slots),
        },
      },
      include: goalsInclude,
    });

    return toGoals(row);
  }

  const row = await getPrisma().goals.create({
    data: {
      ...budgetData(input),
      slots: { create: slotsToCreate(input.slots) },
    },
    include: goalsInclude,
  });

  return toGoals(row);
}
