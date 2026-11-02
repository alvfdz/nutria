"use client";

import {
  useActionState,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { ArrowDown, ArrowUp, EllipsisVertical, Plus, X } from "lucide-react";
import { cn } from "cn";

import { saveGoalsAction } from "@/app/(app)/goals/actions";
import {
  Dot,
  MacroBar,
  MacroDot,
  SegmentedBar,
  mealTint,
  type MacroName,
} from "@/components/segmented-bar";
import { SplitSlider } from "@/components/goals/split-slider";
import { StatTiles } from "@/components/stat-tile";
import { FieldError, StatusLine } from "@/components/status-line";
import { UnitInput } from "@/components/unit-input";
import { useUnsavedChangesGuard } from "@/components/goals/use-unsaved-changes-guard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import {
  CARD_CLASS,
  CARD_TITLE_CLASS,
  ICON_STROKE,
  THIN_SPACE,
} from "@/lib/design-system";
import { computeMacroBudget, computeSlotBudgets } from "@/lib/goals/budget";
import { daySplitSegments, overLimitPosition } from "@/lib/goals/day-split";
import {
  formatWhole,
  percentTotalStatus,
  removedMealWarning,
  saveBlockerMessage,
} from "@/lib/goals/display";
import {
  initialGoalsFormState,
  type GoalsFieldErrorKey,
  type GoalsFieldErrors,
  type GoalsFormState,
} from "@/lib/goals/form-state";
import {
  apportion,
  sharesAfterAdding,
  sharesAfterRemoving,
} from "@/lib/goals/shares";
import type { Goals } from "@/lib/goals/types";
import type { SlotPlanUsage } from "@/lib/plan/types";

/** Highest number of daily meals the form offers. */
const MAX_MEALS = 8;

/**
 * Opts a row action button out of Firefox's persistence of a `<button>`'s
 * dynamic `disabled` state across page loads (see the `disabled` attribute on
 * MDN and Firefox bug 654072). An unsaved edit can flip a row button's disabled
 * state — adding a meal re-enables the previously-last row's "Move down" — so a
 * reload would otherwise restore a state that contradicts the freshly
 * server-rendered HTML and trigger a hydration mismatch React never patches.
 * React's `ButtonHTMLAttributes` omits `autoComplete` for buttons, so it is
 * spread in rather than set as a typed prop.
 */
const NO_STATE_RESTORE = { autoComplete: "off" } as const;

/** Seed values for a first-time visit without stored goals. */
const DEFAULT_CALORIES = 2000;
const DEFAULT_MACROS = { proteinPct: "30", carbsPct: "40", fatPct: "30" };
const DEFAULT_SLOTS = [
  { name: "Breakfast", percent: "30" },
  { name: "Lunch", percent: "40" },
  { name: "Dinner", percent: "30" },
];

/** A ghost row action: muted until hovered, and at the 32px icon size. */
const ROW_ACTION_CLASS = "text-muted-foreground";

/**
 * A row input with no box of its own: transparent until hovered or focused, or
 * always filled on touch screens, where no hover would reveal it can be edited.
 * The `has-` variants cover an input group, whose inner input takes the focus.
 */
const INLINE_INPUT_CLASS =
  "border-transparent bg-transparent hover:bg-muted focus-visible:bg-muted has-[:focus-visible]:bg-muted pointer-coarse:bg-muted dark:bg-transparent dark:hover:bg-muted dark:focus-visible:bg-muted dark:has-[:focus-visible]:bg-muted dark:pointer-coarse:bg-muted";

/** A column heading in the summary table: quiet, and aligned with its numbers. */
const SUMMARY_HEAD_CLASS =
  "text-muted-foreground h-8 px-0 text-right text-xs font-normal";

/** A number in the summary table, right-aligned so the digits line up. */
const SUMMARY_CELL_CLASS = "text-muted-foreground px-0 py-1.5 text-right";

/** A macro's form field. */
type MacroFieldName = "proteinPct" | "carbsPct" | "fatPct";

/** The macro inputs, in the fixed protein, carbs, fat order. */
const MACRO_FIELDS: {
  macro: MacroName;
  name: MacroFieldName;
  label: string;
}[] = [
  { macro: "protein", name: "proteinPct", label: "Protein" },
  { macro: "carbs", name: "carbsPct", label: "Carbs" },
  { macro: "fat", name: "fatPct", label: "Fat" },
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

/** Reads a typed share as a number, treating anything unparsable as 0. */
const shareOf = (row: Row) => Number(row.percent) || 0;

/** Where a row asks for focus after a change, by its `data-row-focus` value. */
type RowFocusRequest = { key: string; target: string; select?: boolean };

/** The editable values of the form, as bound to its inputs. */
type FormValues = {
  calories: string;
  proteinPct: string;
  carbsPct: string;
  fatPct: string;
  rows: Row[];
};

/**
 * Builds the values the form starts from, and returns to on reset.
 *
 * @param goals The stored goals, or `null` for the first-visit defaults.
 * @returns The seed values.
 */
function seedValues(goals: Goals | null): FormValues {
  if (!goals) {
    return {
      calories: String(DEFAULT_CALORIES),
      ...DEFAULT_MACROS,
      rows: DEFAULT_SLOTS.map((slot, index) => ({
        key: `row-${index}`,
        ...slot,
      })),
    };
  }

  return {
    calories: String(goals.calories),
    proteinPct: String(goals.proteinPct),
    carbsPct: String(goals.carbsPct),
    fatPct: String(goals.fatPct),
    rows: goals.slots.map((slot, index) => ({
      key: `row-${index}`,
      slotId: slot.id,
      name: slot.name,
      percent: String(slot.percent),
    })),
  };
}

/**
 * Serializes what a save would submit, so two sets of values compare equal when
 * saving would change nothing. Row keys are left out: they identify a row in
 * React and never reach the server.
 *
 * @param values The form values.
 * @returns A string that is equal exactly when the submitted values are.
 */
function submittedSnapshot({ rows, ...budget }: FormValues): string {
  return JSON.stringify({
    ...budget,
    rows: rows.map((row) => [row.slotId, row.name, row.percent]),
  });
}

/**
 * The name a meal goes by in labels and announcements.
 *
 * @param row The meal row.
 * @param index The row's position, used when the name is blank.
 * @returns The typed name, or `Meal N`.
 */
function mealLabel(row: Row, index: number): string {
  return row.name.trim() || `Meal ${index + 1}`;
}

/**
 * The goals page's client entry. Owns the save action's `useActionState` and
 * turns a successful save into a visible toast, then renders the form keyed on
 * `goals.updatedAt` so a save remounts it seeded from the stored values. The
 * key deliberately sits on the child: the action's `refresh()` re-renders the
 * route but keeps this wrapper mounted, so the success state — and the effect
 * below that fires the toast — survive the remount that would otherwise
 * discard them. Resetting the form hides the last submit's errors by dismissing
 * that action state, since `useActionState` offers no way to clear it.
 *
 * @param props.goals The stored goals, or `null` on a first visit.
 * @param props.slotUsage Each stored meal's plans, by slot id; meals without
 * plans can be left out, and it defaults to none.
 * @returns The keyed goals form; never throws.
 */
export function GoalsView({
  goals,
  slotUsage = {},
}: {
  goals: Goals | null;
  slotUsage?: Record<string, SlotPlanUsage>;
}) {
  const [state, formAction, pending] = useActionState(
    saveGoalsAction,
    initialGoalsFormState,
  );

  const [dismissedState, setDismissedState] = useState<GoalsFormState | null>(
    null,
  );

  // One toast per completed save: `state` gets a fresh object on every
  // submit, so this runs exactly when the action resolves successfully.
  useEffect(() => {
    if (state.status === "success") {
      toast.add({
        type: "success",
        title: state.savedMessage ?? "Goals saved.",
      });
    }
  }, [state]);

  return (
    <GoalsForm
      key={goals?.updatedAt ?? "first"}
      goals={goals}
      slotUsage={slotUsage}
      state={state === dismissedState ? initialGoalsFormState : state}
      formAction={formAction}
      pending={pending}
      onReset={() => setDismissedState(state)}
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
 * toast outlives that remount.
 *
 * On large screens the budget and meals cards take two thirds of the width beside
 * a sticky summary of the daily grams and each meal's slice. Both percentage
 * splits are edited where they are drawn: typed into the inputs, or dragged on
 * the bar through {@link SplitSlider}. Adding or removing a meal rescales the
 * other shares in proportion, so a custom split survives.
 *
 * A submit whose totals cannot pass the schema stops in the browser and focuses
 * the first problem; other failures come back from the action. Server errors are
 * matched to rows by key, because rows can move after the submit, and each one
 * clears as soon as its field is edited. An action bar closes the form and
 * sticks to the viewport while there are unsaved edits.
 *
 * @param props.goals The stored goals, or `null` on a first visit; seeds the
 * local field state.
 * @param props.slotUsage Each stored meal's plans, by slot id.
 * @param props.state State returned by the last save action submit.
 * @param props.formAction Submit handler from the parent's `useActionState`.
 * @param props.pending Whether a save is currently in flight.
 * @param props.onReset Called when the user discards their edits, so the parent
 * can drop the last submit's errors.
 * @returns The goals form markup; never throws.
 */
function GoalsForm({
  goals,
  slotUsage,
  state,
  formAction,
  pending,
  onReset,
}: {
  goals: Goals | null;
  slotUsage: Record<string, SlotPlanUsage>;
  state: GoalsFormState;
  formAction: (formData: FormData) => void;
  pending: boolean;
  onReset: () => void;
}) {
  const baseId = useId();
  const fieldErrors: GoalsFieldErrors = state.fieldErrors ?? {};

  const [seed] = useState(() => seedValues(goals));
  const [calories, setCalories] = useState(seed.calories);
  const [proteinPct, setProteinPct] = useState(seed.proteinPct);
  const [carbsPct, setCarbsPct] = useState(seed.carbsPct);
  const [fatPct, setFatPct] = useState(seed.fatPct);
  const [rows, setRows] = useState(seed.rows);
  const [announcement, setAnnouncement] = useState("");
  // The rows as they were submitted, to read the action's index-based errors.
  const [submittedKeys, setSubmittedKeys] = useState<string[]>([]);
  // Fields edited since the last submit; their errors no longer apply.
  const [editedFields, setEditedFields] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [lastState, setLastState] = useState(state);
  const formRef = useRef<HTMLFormElement>(null);
  const caloriesRef = useRef<HTMLInputElement>(null);
  const pendingRowFocus = useRef<RowFocusRequest | null>(null);

  // A new submit result applies to the fields as they stand now.
  if (state !== lastState) {
    setLastState(state);
    setEditedFields(new Set());
  }

  // Moving a focused button in the DOM, disabling it or removing its row would
  // otherwise drop keyboard focus, so row changes say where it goes next.
  useEffect(() => {
    const request = pendingRowFocus.current;
    if (!request) return;
    pendingRowFocus.current = null;

    const element = formRef.current?.querySelector<HTMLElement>(
      `[data-row-key="${request.key}"] [data-row-focus="${request.target}"]`,
    );
    element?.focus();
    if (request.select && element instanceof HTMLInputElement) element.select();
  }, [rows]);

  const macroFields = {
    proteinPct: { value: proteinPct, setter: setProteinPct },
    carbsPct: { value: carbsPct, setter: setCarbsPct },
    fatPct: { value: fatPct, setter: setFatPct },
  };

  const dirty =
    submittedSnapshot({ calories, proteinPct, carbsPct, fatPct, rows }) !==
    submittedSnapshot(seed);
  const guard = useUnsavedChangesGuard(dirty);

  /** Drops the errors of the named fields, and the form-level error with them. */
  const markEdited = (...fields: string[]) => {
    setEditedFields((current) => new Set([...current, "form", ...fields]));
  };

  /** The errors still showing for a budget field. */
  const budgetErrors = (field: "calories" | MacroFieldName) =>
    editedFields.has(field) ? undefined : fieldErrors[field];

  /** The errors still showing for a row's field, wherever the row is now. */
  const rowErrors = (key: string, field: "name" | "percent") => {
    const submittedIndex = submittedKeys.indexOf(key);
    if (submittedIndex === -1 || editedFields.has(`${key}.${field}`)) {
      return undefined;
    }

    const errorKey: GoalsFieldErrorKey = `slots.${submittedIndex}.${field}`;
    return fieldErrors[errorKey];
  };

  /**
   * Discards the edits and any errors from the last submit. Focus moves to the
   * first field, because the reset and save buttons both disable themselves once
   * nothing is left to discard, and a disabled button would drop keyboard focus.
   */
  const resetForm = () => {
    setCalories(seed.calories);
    setProteinPct(seed.proteinPct);
    setCarbsPct(seed.carbsPct);
    setFatPct(seed.fatPct);
    setRows(seed.rows);
    setEditedFields(new Set());
    setAnnouncement("Changes discarded");
    onReset();
    caloriesRef.current?.focus();
  };

  /** Applies new shares to the rows, clearing any errors on the old ones. */
  const applyShares = (nextRows: Row[], percents: number[]) => {
    setRows(
      nextRows.map((row, index) => ({
        ...row,
        percent: String(percents[index]),
      })),
    );
    markEdited(...nextRows.map((row) => `${row.key}.percent`));
  };

  /**
   * Adds a meal with an even share of the day, shrinking the others in proportion
   * so their relative sizes survive. Focus lands on the new name, ready to type.
   * Appended rows get a random key, because a row's original key stops matching
   * its position after a middle removal and a positional fallback would collide.
   */
  const addRow = () => {
    if (rows.length >= MAX_MEALS) return;

    const row: Row = {
      key: crypto.randomUUID(),
      name: `Meal ${rows.length + 1}`,
      percent: "0",
    };
    pendingRowFocus.current = { key: row.key, target: "name", select: true };
    applyShares([...rows, row], sharesAfterAdding(rows.map(shareOf)));
    setAnnouncement(`${row.name} added`);
  };

  /** Gives every meal the same share, for a fresh start after heavy editing. */
  const splitEvenly = () => {
    applyShares(rows, apportion(rows.map(() => 1)));
    setAnnouncement("Meals split evenly");
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
   * which cannot see the reordered rows move. Focus stays on the control that
   * was used, or moves to the opposite arrow if this one has reached an end.
   */
  const moveRow = (index: number, delta: number, from: "buttons" | "menu") => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;

    const atEnd = target === 0 || target === rows.length - 1;
    const direction = delta < 0 === !atEnd ? "up" : "down";
    pendingRowFocus.current = {
      key: rows[index].key,
      target: from === "menu" ? "menu" : direction,
    };

    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
    markEdited();
    setAnnouncement(
      `${mealLabel(rows[index], index)} moved to position ${target + 1}`,
    );
  };

  /**
   * Removes the row at `index`, handing its share to the others in proportion.
   * The removal is announced for screen readers, which cannot see the row
   * disappear, and focus moves to the name of the row that takes its place.
   */
  const removeRow = (index: number) => {
    const remaining = rows.filter((_, position) => position !== index);
    const neighbour = remaining[Math.min(index, remaining.length - 1)];
    if (neighbour) {
      pendingRowFocus.current = { key: neighbour.key, target: "name" };
    }

    applyShares(remaining, sharesAfterRemoving(rows.map(shareOf), index));
    setAnnouncement(`${mealLabel(rows[index], index)} removed`);
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

  // Shares clamped to 0–100, so a stray out-of-range entry cannot stretch the
  // bar past its track; the bar and every per-meal number read from these.
  const shares = useMemo(
    () => rows.map((row) => Math.min(100, Math.max(0, shareOf(row)))),
    [rows],
  );
  const slotBudgets = useMemo(
    () =>
      source
        ? computeSlotBudgets(
            source,
            shares.map((percent) => ({ percent })),
          )
        : [],
    [source, shares],
  );
  const segments = useMemo(() => daySplitSegments(shares), [shares]);

  const macroShares = [
    Number(proteinPct) || 0,
    Number(carbsPct) || 0,
    Number(fatPct) || 0,
  ];
  const macroStatus = percentTotalStatus(
    "Macros",
    macroShares.reduce((sum, share) => sum + share, 0),
  );
  const mealStatus = percentTotalStatus(
    "Meals",
    rows.reduce((sum, row) => sum + shareOf(row), 0),
  );
  const blocker = saveBlockerMessage(macroStatus.valid, mealStatus.valid);
  const formError = editedFields.has("form") ? undefined : state.formError;

  const evenShares = apportion(rows.map(() => 1));
  const alreadyEven = rows.every(
    (row, index) => shareOf(row) === evenShares[index],
  );

  const keptSlotIds = new Set(rows.map((row) => row.slotId));
  const removalWarnings = (goals?.slots ?? []).flatMap((slot) => {
    if (keptSlotIds.has(slot.id)) return [];
    const message = removedMealWarning(slot.name, slotUsage[slot.id]);

    return message ? [{ id: slot.id, message }] : [];
  });

  /**
   * Stops a submit the schema would refuse and takes the user to the first
   * problem. Otherwise records the row order the action's errors will refer to.
   */
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (blocker) {
      event.preventDefault();
      setAnnouncement(blocker);
      const firstProblem = !macroStatus.valid
        ? formRef.current?.querySelector<HTMLElement>(
            `[name="${MACRO_FIELDS[0].name}"]`,
          )
        : formRef.current?.querySelector<HTMLElement>(
            '[data-row-focus="percent"]',
          );
      firstProblem?.focus();
      return;
    }

    setSubmittedKeys(rows.map((row) => row.key));
  };

  const caloriesErrors = budgetErrors("calories");

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit}>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-6">
          <Card className={CARD_CLASS}>
            <CardHeader>
              <CardTitle className={CARD_TITLE_CLASS}>
                {goals ? "Daily goals" : "Set your daily goals"}
              </CardTitle>
              {goals ? null : (
                <CardDescription>
                  Start from these defaults or change them. The planner uses
                  what you save here.
                </CardDescription>
              )}
            </CardHeader>

            <CardContent>
              <FieldSet>
                <FieldLegend className="sr-only">Daily budget</FieldLegend>

                <FieldGroup className="gap-6">
                  <Field
                    className="sm:max-w-48"
                    data-invalid={caloriesErrors ? true : undefined}
                  >
                    <FieldLabel htmlFor={`${baseId}-calories`}>
                      Calories<span className="sr-only"> (kcal)</span>
                    </FieldLabel>
                    <UnitInput
                      ref={caloriesRef}
                      unit="kcal"
                      id={`${baseId}-calories`}
                      name="calories"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step="any"
                      value={calories}
                      onChange={(event) => {
                        setCalories(event.target.value);
                        markEdited("calories");
                      }}
                      placeholder="2000"
                      aria-invalid={caloriesErrors ? true : undefined}
                      aria-describedby={
                        caloriesErrors ? `${baseId}-calories-error` : undefined
                      }
                    />
                    <FieldError
                      id={`${baseId}-calories-error`}
                      errors={caloriesErrors}
                    />
                  </Field>

                  <div className="flex flex-col gap-3">
                    <FieldGroup className="grid grid-cols-3 gap-3">
                      {MACRO_FIELDS.map(({ macro, name, label }) => {
                        const id = `${baseId}-${name}`;
                        const errors = budgetErrors(name);
                        const { value, setter } = macroFields[name];

                        return (
                          <Field
                            key={name}
                            className="min-w-0 content-start"
                            data-invalid={errors ? true : undefined}
                          >
                            <FieldLabel htmlFor={id}>
                              <MacroDot macro={macro} />
                              <span>
                                {label}
                                <span className="sr-only"> %</span>
                              </span>
                            </FieldLabel>
                            <UnitInput
                              unit="%"
                              id={id}
                              name={name}
                              type="number"
                              inputMode="decimal"
                              min={0}
                              max={100}
                              step="any"
                              value={value}
                              onChange={(event) => {
                                setter(event.target.value);
                                markEdited(name);
                              }}
                              aria-invalid={errors ? true : undefined}
                              aria-describedby={
                                errors ? `${id}-error` : undefined
                              }
                            />
                            <FieldError id={`${id}-error`} errors={errors} />
                          </Field>
                        );
                      })}
                    </FieldGroup>

                    <SplitSlider
                      label="Macro split"
                      names={MACRO_FIELDS.map((field) => field.label)}
                      shares={macroShares}
                      onChange={(next) => {
                        setProteinPct(String(next[0]));
                        setCarbsPct(String(next[1]));
                        setFatPct(String(next[2]));
                        markEdited(...MACRO_FIELDS.map((field) => field.name));
                      }}
                    >
                      <MacroBar
                        proteinPct={macroShares[0]}
                        carbsPct={macroShares[1]}
                        fatPct={macroShares[2]}
                      />
                    </SplitSlider>
                    <StatusLine valid={macroStatus.valid}>
                      {macroStatus.message}
                    </StatusLine>
                  </div>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>

          <Card className={CARD_CLASS}>
            <CardHeader>
              <CardTitle className={CARD_TITLE_CLASS}>Meals</CardTitle>
              <CardDescription>
                How your day&apos;s calories are shared.
                {rows.length >= MAX_MEALS
                  ? ` You can have up to ${MAX_MEALS} meals.`
                  : null}
              </CardDescription>
              <CardAction>
                <Button
                  type="button"
                  variant="outline"
                  {...NO_STATE_RESTORE}
                  disabled={rows.length >= MAX_MEALS}
                  onClick={addRow}
                >
                  <Plus
                    data-icon="inline-start"
                    strokeWidth={ICON_STROKE}
                    className="text-brand"
                  />
                  Add meal
                </Button>
              </CardAction>
            </CardHeader>

            <CardContent>
              <FieldSet>
                <FieldLegend className="sr-only">Meal shares</FieldLegend>

                <SplitSlider
                  label="Meal split"
                  names={rows.map(mealLabel)}
                  shares={shares}
                  onChange={(next) => applyShares(rows, next)}
                >
                  {/* The bar is decorative: every row below spells out its own
                      share, so a screen reader loses nothing. */}
                  <SegmentedBar
                    slot="day-split-bar"
                    segmentSlot="day-split-segment"
                    limitPercent={overLimitPosition(shares)}
                    segments={segments.flatMap((segment, index) => {
                      const row = rows[index];
                      if (!row) return [];

                      return {
                        key: row.key,
                        widthPercent: segment.widthPercent,
                        ...mealTint(index, rows.length, segment.opacity),
                      };
                    })}
                  />
                </SplitSlider>

                <div className="divide-border-subtle flex flex-col divide-y">
                  {rows.map((row, index) => {
                    const label = mealLabel(row, index);
                    const nameErrorId = `${baseId}-${row.key}-name-error`;
                    const percentId = `${baseId}-${row.key}-percent`;
                    const percentErrorId = `${percentId}-error`;
                    const nameErrors = rowErrors(row.key, "name");
                    const percentErrors = rowErrors(row.key, "percent");
                    const budget = slotBudgets[index];
                    const isFirst = index === 0;
                    const isLast = index === rows.length - 1;

                    return (
                      <div
                        key={row.key}
                        data-slot="meal-row"
                        data-row-key={row.key}
                        className="grid gap-1 py-2 first:pt-0 last:pb-0"
                      >
                        <input
                          type="hidden"
                          name="slotId"
                          value={row.slotId ?? ""}
                        />

                        <div className="flex items-center gap-1">
                          <Dot
                            data-slot="day-split-swatch"
                            {...mealTint(
                              index,
                              rows.length,
                              segments[index]?.opacity,
                            )}
                          />
                          <Input
                            data-row-focus="name"
                            id={`${baseId}-${row.key}-name`}
                            name="slotName"
                            value={row.name}
                            onChange={(event) => {
                              updateRow(row.key, { name: event.target.value });
                              markEdited(`${row.key}.name`);
                            }}
                            placeholder={`Meal ${index + 1}`}
                            className={cn(INLINE_INPUT_CLASS, "min-w-0 flex-1")}
                            aria-label={`Meal ${index + 1} name`}
                            aria-invalid={nameErrors ? true : undefined}
                            aria-describedby={
                              nameErrors ? nameErrorId : undefined
                            }
                          />

                          <span className="type-caption text-muted-foreground w-15 shrink-0 text-right whitespace-nowrap">
                            {budget
                              ? `${formatWhole(budget.calories)}${THIN_SPACE}kcal`
                              : null}
                          </span>

                          <UnitInput
                            data-row-focus="percent"
                            unit="%"
                            id={percentId}
                            name="slotPercent"
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={100}
                            step="any"
                            value={row.percent}
                            onChange={(event) => {
                              updateRow(row.key, {
                                percent: event.target.value,
                              });
                              markEdited(`${row.key}.percent`);
                            }}
                            groupClassName={cn(
                              INLINE_INPUT_CLASS,
                              "w-16 shrink-0",
                            )}
                            aria-label={`Meal ${index + 1} share (%)`}
                            aria-invalid={percentErrors ? true : undefined}
                            aria-describedby={
                              percentErrors ? percentErrorId : undefined
                            }
                          />

                          {/* See {@link NO_STATE_RESTORE}: it keeps Firefox's
                              button-state restore from resurrecting a stale
                              disabled state that no longer matches the rows. */}
                          <div className="hidden shrink-0 items-center gap-1 sm:flex">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={ROW_ACTION_CLASS}
                              {...NO_STATE_RESTORE}
                              data-row-focus="up"
                              aria-label={`Move ${label} up`}
                              disabled={isFirst}
                              onClick={() => moveRow(index, -1, "buttons")}
                            >
                              <ArrowUp strokeWidth={ICON_STROKE} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={ROW_ACTION_CLASS}
                              {...NO_STATE_RESTORE}
                              data-row-focus="down"
                              aria-label={`Move ${label} down`}
                              disabled={isLast}
                              onClick={() => moveRow(index, 1, "buttons")}
                            >
                              <ArrowDown strokeWidth={ICON_STROKE} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={ROW_ACTION_CLASS}
                              {...NO_STATE_RESTORE}
                              aria-label={`Remove ${label}`}
                              disabled={rows.length === 1}
                              onClick={() => removeRow(index)}
                            >
                              <X strokeWidth={ICON_STROKE} />
                            </Button>
                          </div>

                          {/* Phones keep the name legible by folding the three
                              row actions into one menu. */}
                          <div className="shrink-0 sm:hidden">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={ROW_ACTION_CLASS}
                                    {...NO_STATE_RESTORE}
                                    data-row-focus="menu"
                                    aria-label={`Actions for ${label}`}
                                  />
                                }
                              >
                                <EllipsisVertical strokeWidth={ICON_STROKE} />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="nutria-theme"
                              >
                                <DropdownMenuGroup>
                                  <DropdownMenuItem
                                    disabled={isFirst}
                                    onClick={() => moveRow(index, -1, "menu")}
                                  >
                                    <ArrowUp strokeWidth={ICON_STROKE} />
                                    Move up
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={isLast}
                                    onClick={() => moveRow(index, 1, "menu")}
                                  >
                                    <ArrowDown strokeWidth={ICON_STROKE} />
                                    Move down
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={rows.length === 1}
                                    onClick={() => removeRow(index)}
                                  >
                                    <X strokeWidth={ICON_STROKE} />
                                    Remove
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <FieldError id={nameErrorId} errors={nameErrors} />
                        <FieldError
                          id={percentErrorId}
                          errors={percentErrors}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-start justify-between gap-3">
                  <StatusLine valid={mealStatus.valid}>
                    {mealStatus.message}
                  </StatusLine>
                  {rows.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="-mt-1 text-muted-foreground"
                      {...NO_STATE_RESTORE}
                      disabled={alreadyEven}
                      onClick={splitEvenly}
                    >
                      Split evenly
                    </Button>
                  ) : null}
                </div>

                {removalWarnings.map((warning) => (
                  <StatusLine key={warning.id} valid={false}>
                    {warning.message}
                  </StatusLine>
                ))}

                {fieldErrors.slots ? (
                  <StatusLine valid={false}>{fieldErrors.slots[0]}</StatusLine>
                ) : null}
              </FieldSet>
            </CardContent>
          </Card>
        </div>

        <Card
          className={cn(
            CARD_CLASS,
            "lg:sticky lg:top-20 lg:max-h-[calc(100vh-11rem)] lg:overflow-auto",
          )}
        >
          <CardHeader>
            <CardTitle className={CARD_TITLE_CLASS}>Your day</CardTitle>
            {daily ? null : (
              <CardDescription>
                Enter a calorie target to see the numbers.
              </CardDescription>
            )}
          </CardHeader>

          {daily ? (
            <CardContent className="grid gap-6">
              <div className="grid gap-1">
                <span className="type-caption text-muted-foreground">
                  Daily target
                </span>
                <p className="type-stat-lg">
                  {formatWhole(daily.calories)}
                  {THIN_SPACE}
                  <span className="text-muted-foreground text-sm font-normal">
                    kcal
                  </span>
                </p>
              </div>

              <StatTiles
                protein={formatWhole(daily.proteinGrams)}
                carbs={formatWhole(daily.carbsGrams)}
                fat={formatWhole(daily.fatGrams)}
              />

              <Table className="table-fixed">
                <TableCaption className="type-caption mt-2 text-left">
                  Protein, carbs and fat in grams.
                </TableCaption>
                <TableHeader className="[&_tr]:border-border-subtle">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={cn(SUMMARY_HEAD_CLASS, "text-left")}>
                      Meal
                    </TableHead>
                    <TableHead className={cn(SUMMARY_HEAD_CLASS, "w-13")}>
                      kcal
                    </TableHead>
                    {MACRO_FIELDS.map(({ macro, label }) => (
                      <TableHead
                        key={macro}
                        className={cn(SUMMARY_HEAD_CLASS, "w-11")}
                      >
                        <span className="inline-flex items-center gap-1">
                          <MacroDot macro={macro} />
                          <span aria-hidden="true">{label[0]}</span>
                          <span className="sr-only">{label}</span>
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slotBudgets.map((budget, index) => {
                    const row = rows[index];
                    if (!row) return null;
                    const label = mealLabel(row, index);

                    return (
                      <TableRow
                        key={row.key}
                        className="border-border-subtle hover:bg-transparent"
                      >
                        <TableCell
                          className="truncate px-0 py-1.5 font-medium"
                          title={label}
                        >
                          {label}
                        </TableCell>
                        <TableCell className={SUMMARY_CELL_CLASS}>
                          {formatWhole(budget.calories)}
                        </TableCell>
                        <TableCell className={SUMMARY_CELL_CLASS}>
                          {formatWhole(budget.proteinGrams)}
                        </TableCell>
                        <TableCell className={SUMMARY_CELL_CLASS}>
                          {formatWhole(budget.carbsGrams)}
                        </TableCell>
                        <TableCell className={SUMMARY_CELL_CLASS}>
                          {formatWhole(budget.fatGrams)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          ) : null}
        </Card>
      </div>

      <div
        data-slot="goals-action-bar"
        className={cn(
          "bg-background mt-6 flex flex-wrap items-center justify-between gap-3 border-t py-4",
          dirty && "sticky bottom-0 z-10",
        )}
      >
        <div className="min-w-0">
          {formError ? (
            <div role="alert">
              <StatusLine valid={false}>{formError}</StatusLine>
            </div>
          ) : blocker ? (
            <StatusLine valid={false}>{blocker}</StatusLine>
          ) : (
            <p className="type-caption text-muted-foreground flex items-center gap-2">
              {dirty ? (
                <Dot data-slot="unsaved-dot" className="bg-brand" />
              ) : null}
              {dirty
                ? "Unsaved changes"
                : goals
                  ? "All changes saved"
                  : "Not saved yet"}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            {...NO_STATE_RESTORE}
            disabled={!dirty || pending}
            onClick={resetForm}
          >
            Reset
          </Button>
          <Button
            type="submit"
            {...NO_STATE_RESTORE}
            disabled={pending || (goals !== null && !dirty)}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Saving…" : goals ? "Save goals" : "Set goals"}
          </Button>
        </div>
      </div>

      <p role="status" className="sr-only">
        {announcement || (state.status === "success" ? state.savedMessage : "")}
      </p>

      <AlertDialog
        open={guard.pendingHref !== null}
        onOpenChange={(open) => {
          if (!open) guard.stay();
        }}
      >
        <AlertDialogContent className="nutria-theme">
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your edits to these goals have not been saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction type="button" onClick={guard.leave}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
