import "server-only";

import { connection } from "next/server";

import {
  type Goals as GoalsDbRow,
  type MealSlot as MealSlotDbRow,
} from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db/prisma";
import { listPlansForSlot } from "@/lib/plan/repository";
import { SlotInUseError } from "./errors";
import type { Goals, NewGoals, NewMealSlot } from "./types";

/** A goals row as reads ask for it: its slots, in dining order. */
type GoalsWithSlots = GoalsDbRow & { slots: MealSlotDbRow[] };

/** A submitted slot known to address an existing row, so `slotId` is present. */
type SubmittedUpdate = NewMealSlot & { slotId: string };

/**
 * What every goals read embeds: the day's meals, delivered in dining order so
 * the form and the planner can render them without re-sorting.
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
 * position in the dining order. Any submitted `slotId` is dropped: a row being
 * created has no identity yet, the database assigns one.
 *
 * @param slots The submitted meal slots, in order.
 * @returns The rows Prisma should create under the goals row.
 */
function slotsToCreate(slots: NewMealSlot[]) {
  return slots.map((slot, index) => ({
    name: slot.name,
    percent: slot.percent,
    sortOrder: index,
  }));
}

/**
 * Narrows a submitted slot to one that updates an existing row.
 *
 * @param slot The submitted slot.
 * @param existingById The stored slots keyed by id.
 * @returns `true` when the submission names a slot that still exists.
 */
function isUpdateOf(
  slot: NewMealSlot,
  existingById: Map<string, MealSlotDbRow>,
): slot is SubmittedUpdate {
  return slot.slotId !== undefined && existingById.has(slot.slotId);
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
 * reconciles the slots by id rather than replacing them. Keeping slot ids
 * stable is what lets a rename or reorder preserve the meals already planned
 * into them.
 *
 * A slot that disappears from the submission is deleted only when it has no
 * plan on today or a future day; deleting it would otherwise cascade those
 * plans away. Plans strictly before today are cleared along with the slot.
 *
 * All slot writes run in one transaction. Surviving rows are parked on
 * negative positions first so a reorder never collides with the
 * `(goalsId, sortOrder)` unique index while the final positions are written.
 *
 * @param input Validated budget and meal slots.
 * @returns The stored goals, slots ordered.
 * @throws {SlotInUseError} If a removed slot still has a forward plan.
 */
export async function saveGoals(input: NewGoals): Promise<Goals> {
  const prisma = getPrisma();
  const existing = await prisma.goals.findFirst({
    include: { slots: true },
  });

  if (!existing) {
    const row = await prisma.goals.create({
      data: {
        ...budgetData(input),
        slots: { create: slotsToCreate(input.slots) },
      },
      include: goalsInclude,
    });

    return toGoals(row);
  }

  const existingById = new Map(existing.slots.map((slot) => [slot.id, slot]));
  const submittedIds = new Set(
    input.slots
      .map((slot) => slot.slotId)
      .filter((id): id is string => id !== undefined),
  );
  const removed = existing.slots.filter((slot) => !submittedIds.has(slot.id));

  for (const slot of removed) {
    const dayKeys = await listPlansForSlot(slot.id);

    if (dayKeys.length > 0) {
      throw new SlotInUseError(slot.name, dayKeys);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.goals.update({
      where: { id: existing.id },
      data: budgetData(input),
    });

    if (removed.length > 0) {
      await tx.mealSlot.deleteMany({
        where: { id: { in: removed.map((slot) => slot.id) } },
      });
    }

    const updates = input.slots.filter((slot) =>
      isUpdateOf(slot, existingById),
    );

    for (const [index, slot] of updates.entries()) {
      await tx.mealSlot.update({
        where: { id: slot.slotId },
        data: { sortOrder: -(index + 1) },
      });
    }

    for (const [index, slot] of input.slots.entries()) {
      if (isUpdateOf(slot, existingById)) {
        await tx.mealSlot.update({
          where: { id: slot.slotId },
          data: { name: slot.name, percent: slot.percent, sortOrder: index },
        });
      } else {
        await tx.mealSlot.create({
          data: {
            name: slot.name,
            percent: slot.percent,
            sortOrder: index,
            goalsId: existing.id,
          },
        });
      }
    }
  });

  const row = await prisma.goals.findFirstOrThrow({ include: goalsInclude });

  return toGoals(row);
}
