import type { ComponentProps } from "react";

import { cn } from "cn";

/** Width tier a {@link PageContainer} can apply. */
export type PageContainerWidth = "default" | "wide";

/**
 * Centred page shell that applies one of the app's two width tiers.
 *
 * The default tier is a *content* width: 1024px, stepping to 1152px at `lg` and
 * 1280px at `xl`, where it stops growing. The ceiling is the point of it. A form
 * field or a table row does not become more useful as it gets wider — past
 * roughly 1300px the extra pixels turn into empty space, and content that fills
 * them reads as stretched rather than spacious. That is why the same page looks
 * calm on a laptop and broken on an ultrawide monitor.
 *
 * `width="wide"` is the *canvas* tier, for surfaces that genuinely fill the
 * room they are given: the calendar's seven day columns, and the site header,
 * which frames the whole app. It applies no cap below `2xl`, so small and
 * mid-size screens render exactly as an uncapped surface would, and then caps at
 * 1800px. Because that cap sits above the `2xl` breakpoint, it only takes effect
 * once the viewport is wider than the cap itself. The tier is chosen with
 * a prop rather than a `className` because its steps live in `lg:`/`xl:`/`2xl:`
 * variants, which a plain `max-w-*` class cannot reliably override.
 *
 * Both tiers carry the same horizontal padding, so no surface ever hugs the
 * viewport edge.
 *
 * Any `className` is merged after the defaults, so callers can adjust spacing
 * (for example `py-10`) or switch the display with utilities like `flex`.
 *
 * @param props - Standard `div` attributes, plus `width`. `className` is merged
 *   with the container defaults rather than replacing them.
 * @param props.width - `"default"` applies the content width; `"wide"` uncaps
 *   below `2xl` and caps at 1800px above it. Defaults to `"default"`.
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
        width === "default" && "max-w-5xl lg:max-w-6xl xl:max-w-7xl",
        width === "wide" && "2xl:max-w-[112.5rem]",
        className,
      )}
      {...props}
    />
  );
}
