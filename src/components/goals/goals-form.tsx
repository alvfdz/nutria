"use client";

import { useActionState, useEffect, useId, useMemo, useState } from "react";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { saveGoalsAction } from "@/app/goals/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeMacroBudget, computeSlotBudgets } from "@/lib/goals/budget";
import {
  initialGoalsFormState,
  type GoalsFieldErrors,
  type GoalsFormState,
} from "@/lib/goals/form-state";
import type { Goals } from "@/lib/goals/types";
import { formatMacro } from "@/lib/ingredients/format";

/** Highest number of daily meals the form offers. */
const MAX_MEALS = 8;

/** Seed values for a first-time visit without stored goals. */
const DEFAULT_CALORIES = 2000;
const DEFAULT_MACROS = { proteinPct: "30", carbsPct: "40", fatPct: "30" };
const DEFAULT_SLOTS = [
  { name: "Breakfast", percent: "30" },
  { name: "Lunch", percent: "40" },
  { name: "Dinner", percent: "30" },
];

/** One meal row: a stable key plus the values its inputs are bound to. */
type Row = {
  /** React key, stable across add/remove so a row keeps its own values. */
  key: string;
  /**
   * Identifier of the stored slot this row edits, if it came from the saved
   * goals. Submitted back so a rename or reorder preserves planned meals.
   */
  slotId?: string;
  /** Name typed in the row, if any. */
  name: string;
  /** Share of the daily budget typed in the row, if any. */
  percent: string;
};

/**
 * Splits 100% evenly across `count` meals. Every row gets
 * `100 / count` rounded to two decimals; the remainder lands on the last row
 * so the sum is exactly 100 and rebalancing never trips the schema's sum
 * check (e.g. three meals → 33.33 / 33.33 / 33.34).
 *
 * @param count Number of meals to divide the day into.
 * @returns One percentage string per meal, summing to 100.
 */
function evenPercents(count: number): string[] {
  const share = Math.round((100 / count) * 100) / 100;
  const last = Math.round((100 - share * (count - 1)) * 100) / 100;
  const percents = Array.from({ length: count - 1 }, () => String(share));

  return [...percents, String(last)];
}

/**
 * Renders the first validation message for a field, wired to the input through
 * `aria-describedby`. Renders nothing when the field is valid.
 */
function FieldError({
  id,
  errors,
}: {
  id: string;
  errors: string[] | undefined;
}) {
  const message = errors?.[0];
  if (!message) return null;

  return (
    <p id={id} className="text-destructive text-xs">
      {message}
    </p>
  );
}

/** One stat of the live summary: a label and a formatted value with a unit. */
function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="grid gap-0.5 text-center">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">
        {formatMacro(value)}{" "}
        <span className="text-muted-foreground font-normal">{unit}</span>
      </dd>
    </div>
  );
}

/**
 * The goals page's client entry. Owns the save action's `useActionState` and
 * turns a successful save into a visible toast, then renders the form keyed on
 * `goals.updatedAt` so a save remounts it seeded from the stored values. The
 * key deliberately sits on the child: the action's `refresh()` re-renders the
 * route but keeps this wrapper mounted, so the success state — and the effect
 * below that fires the toast — survive the remount that would otherwise
 * discard them.
 *
 * @param props.goals The stored goals, or `null` on a first visit.
 * @returns The keyed goals form; never throws.
 */
export function GoalsView({ goals }: { goals: Goals | null }) {
  const [state, formAction, pending] = useActionState(
    saveGoalsAction,
    initialGoalsFormState,
  );

  // One toast per completed save: `state` gets a fresh object on every
  // submit, so this runs exactly when the action resolves successfully.
  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.savedMessage ?? "Goals saved.");
    }
  }, [state]);

  return (
    <GoalsForm
      key={goals?.updatedAt ?? "first"}
      goals={goals}
      state={state}
      formAction={formAction}
      pending={pending}
    />
  );
}

/**
 * The daily goals form. Fields are controlled by local state so React
 * re-applies the entered values after the native form reset that every server
 * action submission triggers; a failed submit therefore keeps the values. The
 * parent keys this component on the stored `goals.updatedAt`, so a successful
 * save remounts it seeded from the freshly saved values; the action state,
 * submit handler and pending flag are passed in from {@link GoalsView} so the
 * toast outlives that remount. On large screens the editor and a sticky
 * live-summary card sit side by side; the summary uses `budget.ts` to show the
 * daily grams, each meal's kcal/gram slice, and a bar for its share of the day
 * while the user edits. Each row also carries up/down buttons that reorder the
 * meals; because the summary maps over the same rows, it follows the new
 * dining order.
 *
 * @param props.goals The stored goals, or `null` on a first visit; seeds the
 * local field state.
 * @param props.state State returned by the last save action submit.
 * @param props.formAction Submit handler from the parent's `useActionState`.
 * @param props.pending Whether a save is currently in flight.
 * @returns The goals form markup; never throws.
 */
function GoalsForm({
  goals,
  state,
  formAction,
  pending,
}: {
  goals: Goals | null;
  state: GoalsFormState;
  formAction: (formData: FormData) => void;
  pending: boolean;
}) {
  const baseId = useId();
  const fieldErrors: GoalsFieldErrors = state.fieldErrors ?? {};

  const [calories, setCalories] = useState(
    goals ? String(goals.calories) : String(DEFAULT_CALORIES),
  );
  const [proteinPct, setProteinPct] = useState(
    goals ? String(goals.proteinPct) : DEFAULT_MACROS.proteinPct,
  );
  const [carbsPct, setCarbsPct] = useState(
    goals ? String(goals.carbsPct) : DEFAULT_MACROS.carbsPct,
  );
  const [fatPct, setFatPct] = useState(
    goals ? String(goals.fatPct) : DEFAULT_MACROS.fatPct,
  );
  const [rows, setRows] = useState<Row[]>(() =>
    goals
      ? goals.slots.map((slot, index) => ({
          key: `row-${index}`,
          slotId: slot.id,
          name: slot.name,
          percent: String(slot.percent),
        }))
      : DEFAULT_SLOTS.map((slot, index) => ({ key: `row-${index}`, ...slot })),
  );
  const [announcement, setAnnouncement] = useState("");

  /**
   * Resizes the day to `count` meals, rebalancing every share to
   * `100 / count` so changing the count can never break the sum-to-100 check.
   * Existing rows keep their names; appended ones default to "Meal N" and get
   * a random key, because a row's original key stops matching its position
   * after a middle removal and a positional fallback would collide.
   */
  const resizeRows = (count: number) => {
    const clamped = Math.max(1, Math.min(MAX_MEALS, Math.floor(count)));
    setRows((current) => {
      const percents = evenPercents(clamped);

      return Array.from({ length: clamped }, (_, index) => ({
        key: current[index]?.key ?? crypto.randomUUID(),
        slotId: current[index]?.slotId,
        name: current[index]?.name ?? `Meal ${index + 1}`,
        percent: percents[index],
      }));
    });
  };

  const updateRow = (key: string, patch: Partial<Omit<Row, "key">>) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  /**
   * Moves the row at `index` by `delta` positions (negative up, positive down),
   * keeping its key, name and share together so the meal — not the position —
   * carries its values. Out-of-range moves are ignored, so the arrow buttons
   * disabled at the ends stay no-ops. The jump is announced for screen readers,
   * which cannot see the reordered rows move.
   */
  const moveRow = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;

    const label = rows[index].name || `Meal ${index + 1}`;
    setRows((current) => {
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setAnnouncement(`${label} moved to position ${target + 1}`);
  };

  /**
   * Removes the row at `index`, keeping every surviving row's key, slot id,
   * name and share, then rebalances the remaining shares to `100 / count` so
   * the sum-to-100 check always holds. The removal is announced for screen
   * readers, which cannot see the row disappear.
   */
  const removeRow = (index: number) => {
    setRows((current) => {
      const remaining = current.filter((_, position) => position !== index);
      const percents = evenPercents(remaining.length);

      return remaining.map((row, position) => ({
        ...row,
        percent: percents[position],
      }));
    });
    const label = rows[index].name || `Meal ${index + 1}`;
    setAnnouncement(`${label} removed`);
  };

  // Live summary inputs: an empty or non-numeric calorie field hides it.
  const source = useMemo(() => {
    const caloriesValue = Number(calories);
    if (!Number.isFinite(caloriesValue) || caloriesValue <= 0) return null;

    return {
      calories: caloriesValue,
      proteinPct: Number(proteinPct) || 0,
      carbsPct: Number(carbsPct) || 0,
      fatPct: Number(fatPct) || 0,
    };
  }, [calories, proteinPct, carbsPct, fatPct]);

  const daily = useMemo(
    () => (source ? computeMacroBudget(source) : null),
    [source],
  );
  const slotBudgets = useMemo(
    () =>
      source
        ? computeSlotBudgets(
            source,
            rows.map((row) => ({ percent: Number(row.percent) || 0 })),
          )
        : [],
    [source, rows],
  );

  return (
    <form action={formAction}>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <Card>
          <CardHeader>
            <CardTitle>
              {goals ? "Daily goals" : "Set your daily goals"}
            </CardTitle>
            <CardDescription>
              Your calorie target, macro split, and the meals that divide the
              day&apos;s budget.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-5">
            <fieldset className="grid gap-3">
              <legend className="text-muted-foreground text-xs font-medium">
                Daily budget
              </legend>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="grid min-w-0 gap-1.5">
                  <Label htmlFor={`${baseId}-calories`}>Calories (kcal)</Label>
                  <Input
                    id={`${baseId}-calories`}
                    name="calories"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step="any"
                    value={calories}
                    onChange={(event) => setCalories(event.target.value)}
                    placeholder="2000"
                    aria-invalid={fieldErrors.calories ? true : undefined}
                    aria-describedby={
                      fieldErrors.calories
                        ? `${baseId}-calories-error`
                        : undefined
                    }
                  />
                  <FieldError
                    id={`${baseId}-calories-error`}
                    errors={fieldErrors.calories}
                  />
                </div>

                {(
                  [
                    {
                      label: "Protein %",
                      name: "proteinPct",
                      value: proteinPct,
                      setter: setProteinPct,
                      errorKey: "proteinPct" as const,
                    },
                    {
                      label: "Carbs %",
                      name: "carbsPct",
                      value: carbsPct,
                      setter: setCarbsPct,
                      errorKey: "carbsPct" as const,
                    },
                    {
                      label: "Fat %",
                      name: "fatPct",
                      value: fatPct,
                      setter: setFatPct,
                      errorKey: "fatPct" as const,
                    },
                  ] as const
                ).map((macro) => {
                  const id = `${baseId}-${macro.name}`;
                  const errors = fieldErrors[macro.errorKey];

                  return (
                    <div key={macro.name} className="grid min-w-0 gap-1.5">
                      <Label htmlFor={id}>{macro.label}</Label>
                      <div className="relative">
                        <Input
                          id={id}
                          name={macro.name}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={100}
                          step="any"
                          value={macro.value}
                          onChange={(event) => macro.setter(event.target.value)}
                          className="pr-7"
                          aria-invalid={errors ? true : undefined}
                          aria-describedby={errors ? `${id}-error` : undefined}
                        />
                        <span
                          aria-hidden="true"
                          className="text-muted-foreground pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm"
                        >
                          %
                        </span>
                      </div>
                      <FieldError id={`${id}-error`} errors={errors} />
                    </div>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="grid gap-3">
              <legend className="sr-only">Meals per day</legend>

              <div className="flex items-center gap-2">
                <span
                  id={`${baseId}-meal-count`}
                  className="text-muted-foreground text-xs font-medium"
                >
                  Meals per day
                </span>
                <output
                  aria-labelledby={`${baseId}-meal-count`}
                  className="text-sm font-medium tabular-nums"
                >
                  {rows.length}
                </output>
              </div>

              <div className="grid gap-2">
                {rows.map((row, index) => {
                  const nameErrorId = `${baseId}-slot-${index}-name-error`;
                  const percentId = `${baseId}-slot-${index}-percent`;
                  const percentErrorId = `${percentId}-error`;
                  const nameErrors = fieldErrors[`slots.${index}.name`];
                  const percentErrors = fieldErrors[`slots.${index}.percent`];

                  return (
                    <div key={row.key} className="flex items-start gap-2">
                      <input
                        type="hidden"
                        name="slotId"
                        value={row.slotId ?? ""}
                      />
                      <div className="grid min-w-0 flex-1 gap-1.5">
                        <Input
                          id={`${baseId}-slot-${index}-name`}
                          name="slotName"
                          value={row.name}
                          onChange={(event) =>
                            updateRow(row.key, { name: event.target.value })
                          }
                          placeholder={`Meal ${index + 1}`}
                          aria-label={`Meal ${index + 1} name`}
                          aria-invalid={nameErrors ? true : undefined}
                          aria-describedby={
                            nameErrors ? nameErrorId : undefined
                          }
                        />
                        <FieldError id={nameErrorId} errors={nameErrors} />
                      </div>

                      <div className="grid w-24 gap-1.5">
                        <div className="relative">
                          <Input
                            id={percentId}
                            name="slotPercent"
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={100}
                            step="any"
                            value={row.percent}
                            onChange={(event) =>
                              updateRow(row.key, {
                                percent: event.target.value,
                              })
                            }
                            className="pr-7"
                            aria-label={`Meal ${index + 1} share (%)`}
                            aria-invalid={percentErrors ? true : undefined}
                            aria-describedby={
                              percentErrors ? percentErrorId : undefined
                            }
                          />
                          <span
                            aria-hidden="true"
                            className="text-muted-foreground pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-sm"
                          >
                            %
                          </span>
                        </div>
                        <FieldError
                          id={percentErrorId}
                          errors={percentErrors}
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Move meal ${index + 1} up`}
                        disabled={index === 0}
                        onClick={() => moveRow(index, -1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Move meal ${index + 1} down`}
                        disabled={index === rows.length - 1}
                        onClick={() => moveRow(index, 1)}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove meal ${index + 1}`}
                        disabled={rows.length === 1}
                        onClick={() => removeRow(index)}
                      >
                        <X />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => resizeRows(rows.length + 1)}
                >
                  <Plus /> Add meal
                </Button>
              </div>

              {fieldErrors.slots ? (
                <p className="text-destructive text-xs">
                  {fieldErrors.slots[0]}
                </p>
              ) : null}
            </fieldset>

            {state.formError ? (
              <p role="alert" className="text-destructive text-sm">
                {state.formError}
              </p>
            ) : null}
          </CardContent>

          <CardFooter className="justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : goals ? "Save goals" : "Set goals"}
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-auto">
          <CardHeader>
            <CardTitle>Live summary</CardTitle>
            <CardDescription>
              {daily
                ? "Daily targets and each meal's slice, recalculated as you edit."
                : "Enter a calorie target to see the numbers."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {daily ? (
              <div className="grid gap-4">
                <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
                  <Stat label="Calories" value={daily.calories} unit="kcal" />
                  <Stat label="Protein" value={daily.proteinGrams} unit="g" />
                  <Stat label="Carbs" value={daily.carbsGrams} unit="g" />
                  <Stat label="Fat" value={daily.fatGrams} unit="g" />
                </dl>

                <ul className="grid gap-4">
                  {slotBudgets.map((budget, index) => {
                    const row = rows[index];
                    if (!row) return null;
                    const share = Math.min(
                      100,
                      Math.max(0, Number(row.percent) || 0),
                    );

                    return (
                      <li key={row.key} className="grid gap-2">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm font-medium">
                            {row.name || `Meal ${index + 1}`}
                          </span>
                          <span className="text-muted-foreground text-xs tabular-nums">
                            {formatMacro(share)}%
                          </span>
                        </div>
                        <div
                          aria-hidden="true"
                          className="bg-muted h-1.5 overflow-hidden rounded-full"
                        >
                          <div
                            className="bg-primary h-full rounded-full"
                            style={{ width: `${share}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {formatMacro(budget.calories)} kcal · P{" "}
                          {formatMacro(budget.proteinGrams)} g · C{" "}
                          {formatMacro(budget.carbsGrams)} g · F{" "}
                          {formatMacro(budget.fatGrams)} g
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Enter your daily calories to see the gram targets.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <p role="status" className="sr-only">
        {announcement || (state.status === "success" ? state.savedMessage : "")}
      </p>
    </form>
  );
}
