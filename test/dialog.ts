import { screen, waitFor } from "@testing-library/react";
import { expect } from "vitest";

/**
 * Waits until the open dialog has moved focus inside itself.
 *
 * Base UI focuses a dialog's first field a moment after it opens. A test that
 * types before then can have that focus move land mid-typing, sending the
 * rest of the keystrokes to the wrong field. That only shows on a slow
 * machine, such as a CI runner, so call this after opening a dialog and
 * before typing into it.
 *
 * @param name The dialog's accessible name, when more than one is open.
 * @returns Resolves once focus is inside the dialog.
 * @throws {Error} When no dialog, or more than one without `name`, is open,
 * or focus doesn't move inside it before `waitFor` times out.
 */
export async function waitForDialogFocus(name?: string): Promise<void> {
  await waitFor(() => {
    const dialog = screen.getByRole("dialog", name ? { name } : undefined);
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });
}
