"use client";

import { useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { markTutorialSeenAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CARD_TITLE_CLASS, OVERLAY_THEME_CLASS } from "@/lib/design-system";
import { TUTORIAL_STEPS } from "@/lib/tutorial/steps";

/**
 * The welcome tutorial: a small step-by-step dialog explaining the order Nutria
 * is used in. However it closes, it counts as seen. That's saved before moving
 * on, because the page reading it straight afterwards would otherwise open it
 * again. A save that fails doesn't hold the user up.
 *
 * @param props.hasGoals Whether a budget exists; without one, the last step
 * leads to setting it.
 */
export function WelcomeTutorial({ hasGoals }: { hasGoals: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  // Focus starts on Next rather than on the first button, Skip, so pressing
  // Enter moves through the tutorial instead of dismissing it.
  const nextButton = useRef<HTMLButtonElement>(null);

  const step = TUTORIAL_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TUTORIAL_STEPS.length - 1;

  /**
   * Closes the dialog, saves that it was seen, then moves on. Going to `/` also
   * drops `?tutorial=replay`, so a reload doesn't open it again.
   *
   * @param destination Where to go once saved.
   */
  async function close(destination: "/" | "/goals" = "/") {
    setOpen(false);

    try {
      await markTutorialSeenAction();
    } catch (error) {
      console.error("Could not record that the tutorial was seen", error);
    }

    router.replace(destination);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) void close();
      }}
    >
      <DialogContent className={OVERLAY_THEME_CLASS} initialFocus={nextButton}>
        <DialogHeader>
          <DialogTitle className={CARD_TITLE_CLASS}>
            Welcome to Nutria
          </DialogTitle>
        </DialogHeader>

        <div aria-live="polite" className="grid gap-1">
          <p className="type-caption text-muted-foreground">
            Step {stepIndex + 1} of {TUTORIAL_STEPS.length}
          </p>
          <p className="text-sm font-medium">{step.title}</p>
          <p className="text-muted-foreground text-sm">{step.description}</p>
        </div>

        <DialogFooter className="flex-row items-center">
          {isLast ? null : (
            <Button variant="ghost" onClick={() => void close()}>
              Skip
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            {isFirst ? null : (
              <Button
                variant="outline"
                onClick={() => setStepIndex(stepIndex - 1)}
              >
                Back
              </Button>
            )}
            {!isLast ? (
              <Button
                ref={nextButton}
                onClick={() => setStepIndex(stepIndex + 1)}
              >
                Next
              </Button>
            ) : hasGoals ? (
              <Button onClick={() => void close()}>Done</Button>
            ) : (
              <Button onClick={() => void close("/goals")}>
                Set your budget
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
