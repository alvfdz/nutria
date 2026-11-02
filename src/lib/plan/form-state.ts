/**
 * State returned by {@link assignMealAction} on every submit, consumed by the
 * add-meal picker's `useActionState`.
 */
export type AssignMealState = {
  /** Outcome of the last submit. */
  status: "idle" | "error" | "success";
  /** Message for a failure such as a past date or a duplicate. */
  formError?: string;
  /** Name echoed back on success so it can be announced to screen readers. */
  assignedName?: string;
};

/** State a freshly mounted assign dialog starts from. */
export const initialAssignMealState: AssignMealState = {
  status: "idle",
};

/**
 * State returned by {@link removeMealAction} on every submit, consumed by the
 * board's shared `useActionState`.
 */
export type RemoveMealState = {
  /** Outcome of the last submit. */
  status: "idle" | "error" | "success";
  /** Message for a failure such as a past date or an unknown plan. */
  formError?: string;
  /** Name echoed back on success so it can be announced to screen readers. */
  removedName?: string;
};

/** State the board's remove form starts from. */
export const initialRemoveMealState: RemoveMealState = {
  status: "idle",
};

/** State returned by {@link setMealEatenAction} for one tick. */
export type SetMealEatenState = {
  /** Outcome of the last submit. */
  status: "idle" | "error" | "success";
  /** Message for a failure such as a day that isn't today. */
  formError?: string;
};

/** State a tick starts from. */
export const initialSetMealEatenState: SetMealEatenState = {
  status: "idle",
};

/**
 * State returned by {@link swapMealAction} on every submit, consumed by the
 * swap picker's `useActionState`.
 */
export type SwapMealState = {
  /** Outcome of the last submit. */
  status: "idle" | "error" | "success";
  /** Message for a failure such as a meal that has already been ticked. */
  formError?: string;
  /** Name echoed back on success so it can be announced to screen readers. */
  swappedName?: string;
};

/** State a freshly mounted swap picker starts from. */
export const initialSwapMealState: SwapMealState = {
  status: "idle",
};
