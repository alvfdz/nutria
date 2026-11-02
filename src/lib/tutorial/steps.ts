/** One step of the welcome tutorial. */
export type TutorialStep = {
  /** Short name of the step. */
  title: string;
  /** One sentence saying what to do in it. */
  description: string;
};

/** The welcome tutorial's steps, in the order the app is meant to be used. */
export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    title: "Set your budget",
    description:
      "Choose your daily calories and macros, then split them across your meals.",
  },
  {
    title: "Build your library",
    description:
      "Save the foods you cook with, then combine them into reusable meals.",
  },
  {
    title: "Plan your week",
    description:
      "Put meals on the calendar and see how each day fits your budget.",
  },
  {
    title: "Tick off today",
    description:
      "Come back here each day, mark what you ate and see what's left.",
  },
];
