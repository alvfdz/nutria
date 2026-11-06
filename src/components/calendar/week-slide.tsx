import { ViewTransition } from "react";
import type { ReactNode } from "react";

/**
 * Transition type a navigation to a later week carries, through `Link`'s
 * `transitionTypes`. The shown week slides out to the left and the new one in
 * from the right.
 */
export const WEEK_FORWARD = "week-forward";

/**
 * Transition type a navigation to an earlier week carries, Today included.
 * The shown week slides out to the right and the new one in from the left.
 */
export const WEEK_BACK = "week-back";

/**
 * Maps each week transition type to the CSS class in `globals.css` that
 * animates it. Any other transition (a saved meal, browser back and forward,
 * the first load) maps to `none`, so the week only slides when the week nav
 * moves it.
 */
const SLIDE_CLASSES = {
  [WEEK_FORWARD]: "week-slide-forward",
  [WEEK_BACK]: "week-slide-back",
  default: "none",
};

/**
 * Slides the shown week out and the next one in, like a carousel, when the
 * week nav changes the week. Keyed by the week, so a new week mounts and the
 * old one unmounts, which runs the enter and exit animations. Without View
 * Transitions support, or with reduced motion, the week swaps instantly.
 *
 * @param props.weekStart The shown week's Monday, `YYYY-MM-DD`; changing it
 *   triggers the slide.
 * @param props.children The week's content, a single element to animate.
 */
export function WeekSlide({
  weekStart,
  children,
}: {
  weekStart: string;
  children: ReactNode;
}) {
  return (
    <ViewTransition
      key={weekStart}
      enter={SLIDE_CLASSES}
      exit={SLIDE_CLASSES}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
