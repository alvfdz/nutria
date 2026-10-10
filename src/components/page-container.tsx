import type { ComponentProps } from "react";

import { cn } from "cn";

/**
 * Centred page shell that applies the app's shared width ladder.
 *
 * The container grows with the viewport so library tables can use the extra
 * room on large and ultrawide monitors: 1024px at `lg`, 1152px at `xl`,
 * 1280px at `2xl`, then caps at 1600px. The horizontal padding matches the
 * site header so both stay aligned.
 *
 * Any `className` is merged after the defaults, so callers can adjust spacing
 * (for example `py-10`) or switch the display with utilities like `flex`.
 *
 * @param props - Standard `div` attributes. `className` is merged with the
 *   container defaults rather than replacing them.
 * @returns The centred, width-constrained wrapper.
 */
export function PageContainer({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-5xl px-4 sm:px-6 lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[100rem]",
        className,
      )}
      {...props}
    />
  );
}
