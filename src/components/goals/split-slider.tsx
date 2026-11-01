"use client";

import { Slider } from "@base-ui/react/slider";
import type { ReactNode } from "react";

import { PCT_TOLERANCE } from "@/lib/goals/schema";
import { moveBoundary, splitBoundaries } from "@/lib/goals/shares";

/**
 * Makes a segmented bar draggable: one thumb sits on each divider, and moving it
 * trades share between the two neighbours, so the total stays where it was.
 * Thumbs only appear while the total is valid, since dividers mean nothing on a
 * split that does not add up; the inputs and status line handle that case. Arrow
 * keys move a focused thumb by 1%, and two thumbs stay at least 1% apart.
 *
 * @param props.label Accessible name of the whole control.
 * @param props.names The name of each share, in order, for the thumbs' labels.
 * @param props.shares The current shares, in order.
 * @param props.onChange Called with the new shares after a divider moves.
 * @param props.children The bar to draw under the thumbs.
 * @returns The bar, with thumbs when the split can be dragged; never throws.
 */
export function SplitSlider({
  label,
  names,
  shares,
  onChange,
  children,
}: {
  label: string;
  names: string[];
  shares: number[];
  onChange: (shares: number[]) => void;
  children: ReactNode;
}) {
  const total = shares.reduce((sum, share) => sum + share, 0);
  const interactive =
    shares.length > 1 &&
    Math.abs(total - 100) <= PCT_TOLERANCE &&
    shares.every((share) => share >= 0);
  const boundaries = splitBoundaries(shares);

  return (
    <div className="relative flex h-6 items-center">
      <div className="w-full">{children}</div>

      {interactive ? (
        <Slider.Root
          aria-label={label}
          value={boundaries}
          min={0}
          max={100}
          step={1}
          minStepsBetweenValues={1}
          thumbCollisionBehavior="none"
          onValueChange={(next) => {
            const values = next as number[];
            const moved = values.findIndex(
              (value, index) => value !== boundaries[index],
            );
            if (moved !== -1) {
              onChange(moveBoundary(shares, moved, values[moved]));
            }
          }}
          className="absolute inset-0"
        >
          <Slider.Control className="flex h-full w-full touch-none items-center select-none">
            <Slider.Track className="relative h-full w-full">
              {boundaries.map((_, index) => (
                <Slider.Thumb
                  key={index}
                  index={index}
                  aria-label={`Divider between ${names[index]} and ${names[index + 1]}`}
                  getAriaValueText={(_formatted, _value, thumb) =>
                    `${names[thumb]} ${Math.round(shares[thumb])}%, ${names[thumb + 1]} ${Math.round(shares[thumb + 1])}%`
                  }
                  className="border-foreground bg-background ring-ring/50 relative size-4 rounded-full border-2 transition-shadow select-none after:absolute after:-inset-2 hover:ring-3 has-[:focus-visible]:ring-3"
                />
              ))}
            </Slider.Track>
          </Slider.Control>
        </Slider.Root>
      ) : null}
    </div>
  );
}
