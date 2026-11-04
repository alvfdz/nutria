"use client";

import type { ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverDescription,
  PopoverPopup,
  PopoverPortal,
  PopoverPositioner,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ICON_STROKE, OVERLAY_THEME_CLASS } from "@/lib/design-system";

/** Props for {@link HelpPopover}. */
export type HelpPopoverProps = {
  /** Accessible name of the `?` button, such as "About the calorie target". */
  label: string;
  /** Heading shown at the top of the popover. */
  title: string;
  /** The guidance itself, usually one or two short paragraphs. */
  children: ReactNode;
  /** Extra classes for the trigger button. */
  className?: string;
};

/**
 * A 24px `?` icon button that opens a short note beside a field. It opens on
 * click or tap, so it works on phones and from the keyboard, and also on hover
 * for mouse users. It explains a value; it never holds a form or an action.
 *
 * @param props See {@link HelpPopoverProps}.
 * @returns The trigger button and its popover.
 */
export function HelpPopover({
  label,
  title,
  children,
  className,
}: HelpPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={200}
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className={cn(
              "text-muted-foreground hover:text-foreground",
              className,
            )}
          />
        }
      >
        <CircleHelp className="size-[15px]" strokeWidth={ICON_STROKE} />
        <span className="sr-only">{label}</span>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverPositioner side="top" align="start" sideOffset={6}>
          <PopoverPopup
            className={cn(
              OVERLAY_THEME_CLASS,
              "w-[min(20rem,calc(100vw-2rem))] gap-2 p-3",
            )}
          >
            <PopoverTitle>{title}</PopoverTitle>
            <PopoverDescription render={<div />} className="grid gap-2">
              {children}
            </PopoverDescription>
          </PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  );
}
