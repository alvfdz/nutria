import type { ComponentProps, CSSProperties } from "react";

import { cn } from "cn";

import { daySplitSegments, overLimitPosition } from "@/lib/goals/day-split";

/** The macro colour utilities, keyed by macro. */
export const MACRO_COLOR = {
  protein: "bg-protein",
  carbs: "bg-carbs",
  fat: "bg-fat",
} as const;

/** A macro's identity, as used for its colour. */
export type MacroName = keyof typeof MACRO_COLOR;

/**
 * The 6px round marker that ties a name to its colour. Decorative, because it
 * always sits next to the name it marks.
 *
 * @param props Standard `span` attributes; `className` carries the colour.
 * @returns The dot; never throws.
 */
export function Dot({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-1.5 shrink-0 rounded-full", className)}
      {...props}
    />
  );
}

/**
 * A macro's colour dot.
 *
 * @param props.macro The macro to mark.
 * @returns The coloured dot; never throws.
 */
export function MacroDot({ macro }: { macro: MacroName }) {
  return <Dot className={MACRO_COLOR[macro]} />;
}

/** The design-system meal greys, in meal order. */
const MEAL_COLORS = [
  "bg-meal-1",
  "bg-meal-2",
  "bg-meal-3",
  "bg-meal-4",
] as const;

/**
 * Picks the grey that marks a meal in the day bar and beside its name. A day of
 * up to four meals uses the meal tokens. Longer days run out of tokens, and
 * cycling them would give two meals the same grey, so every meal then takes a
 * step of the primary-colour opacity ramp instead.
 *
 * @param index The meal's position in the day.
 * @param count How many meals the day has.
 * @param opacity The meal's step of the ramp, from `daySplitSegments`.
 * @returns The colour utility, plus the inline opacity when the ramp applies.
 */
export function mealTint(
  index: number,
  count: number,
  opacity: number | undefined,
): { className: string; style?: CSSProperties } {
  const token = count <= MEAL_COLORS.length ? MEAL_COLORS[index] : undefined;

  return token
    ? { className: token }
    : { className: "bg-primary", style: { opacity } };
}

/** One stretch of a {@link SegmentedBar}. */
export type BarSegment = {
  /** React key. */
  key: string;
  /** Width as a percentage of the bar, 0–100. */
  widthPercent: number;
  /** Colour utility for the segment. */
  className: string;
  /** Extra inline style, such as a tint's opacity. */
  style?: CSSProperties;
};

/** Below this, an unclaimed stretch is floating-point noise rather than a gap. */
const MIN_REMAINDER = 0.01;

/**
 * A 6px bar of rounded segments separated by gaps. Whatever the segments leave
 * unclaimed is drawn as a muted stretch, so a total short of 100% is visible.
 * Decorative: callers state the same values as text nearby.
 *
 * @param props.segments The stretches, left to right, summing to at most 100.
 * @param props.slot `data-slot` of the bar.
 * @param props.segmentSlot `data-slot` of each segment.
 * @param props.limitPercent Where to mark 100% on a bar whose segments were
 * scaled back to fit an over-allocated total; omit for a total that fits.
 * @returns The bar; never throws.
 */
export function SegmentedBar({
  segments,
  slot,
  segmentSlot,
  limitPercent,
}: {
  segments: BarSegment[];
  slot: string;
  segmentSlot: string;
  limitPercent?: number | null;
}) {
  const claimed = segments.reduce((sum, item) => sum + item.widthPercent, 0);
  const remainder = 100 - claimed;

  return (
    <div
      aria-hidden="true"
      data-slot={slot}
      className="relative flex h-1.5 gap-0.5"
    >
      {segments.map((segment) => (
        <div
          key={segment.key}
          data-slot={segmentSlot}
          className={cn(
            "h-full min-w-0 rounded-full",
            segment.widthPercent === 0 && "hidden",
            segment.className,
          )}
          style={{ ...segment.style, width: `${segment.widthPercent}%` }}
        />
      ))}
      {remainder > MIN_REMAINDER ? (
        <div
          data-slot={`${slot}-remainder`}
          className="bg-muted h-full min-w-0 rounded-full"
          style={{ width: `${remainder}%` }}
        />
      ) : null}
      {limitPercent != null ? (
        <div
          data-slot={`${slot}-limit`}
          className="bg-destructive absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full"
          style={{ left: `${limitPercent}%` }}
        />
      ) : null}
    </div>
  );
}

/**
 * The protein/carbs/fat split as a {@link SegmentedBar}, always in that order.
 * Out-of-range entries are clamped and an excess total is scaled back, so a
 * mid-edit value cannot overflow the bar; the 100% mark shows how far over it is.
 *
 * @param props.proteinPct Protein's share of the day, as entered.
 * @param props.carbsPct Carbs' share of the day, as entered.
 * @param props.fatPct Fat's share of the day, as entered.
 * @returns The macro bar; never throws.
 */
export function MacroBar({
  proteinPct,
  carbsPct,
  fatPct,
}: {
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}) {
  const [protein, carbs, fat] = daySplitSegments([
    proteinPct,
    carbsPct,
    fatPct,
  ]);

  return (
    <SegmentedBar
      slot="macro-bar"
      segmentSlot="macro-bar-segment"
      limitPercent={overLimitPosition([proteinPct, carbsPct, fatPct])}
      segments={[
        {
          key: "protein",
          widthPercent: protein.widthPercent,
          className: MACRO_COLOR.protein,
        },
        {
          key: "carbs",
          widthPercent: carbs.widthPercent,
          className: MACRO_COLOR.carbs,
        },
        {
          key: "fat",
          widthPercent: fat.widthPercent,
          className: MACRO_COLOR.fat,
        },
      ]}
    />
  );
}
