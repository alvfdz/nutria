import type { ComponentProps } from "react";

import { cn } from "cn";

/** Width ladder a {@link PageContainer} can apply. */
export type PageContainerWidth = "default" | "full";

/**
 * Centred page shell that applies the app's shared width ladder.
 *
 * The container grows with the viewport so library tables can use the extra
 * room on large and ultrawide monitors: 1024px at `lg`, 1152px at `xl`,
 * 1280px at `2xl`, then caps at 1600px. The horizontal padding matches the
 * site header so both stay aligned.
 *
 * `width="full"` drops the ladder entirely: the surface spans the viewport
 * with only the horizontal padding as a margin. It is meant for boards that
 * benefit from every pixel (the calendar), not for reading-width pages. The
 * ladder is chosen with a prop rather than a `className` because its larger
 * steps live in `lg:`/`xl:`/`2xl:` variants, which a plain `max-w-*` class
 * cannot reliably override.
 *
 * Any `className` is merged after the defaults, so callers can adjust spacing
 * (for example `py-10`) or switch the display with utilities like `flex`.
 *
 * @param props - Standard `div` attributes, plus `width`. `className` is merged
 *   with the container defaults rather than replacing them.
 * @param props.width - `"default"` keeps the shared width ladder; `"full"`
 *   removes the max-width cap. Defaults to `"default"`.
 * @returns The centred, width-constrained wrapper.
 */
export function PageContainer({
  className,
  width = "default",
  ...props
}: ComponentProps<"div"> & { width?: PageContainerWidth }) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6",
        width === "default" &&
          "max-w-5xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[100rem]",
        className,
      )}
      {...props}
    />
  );
}
