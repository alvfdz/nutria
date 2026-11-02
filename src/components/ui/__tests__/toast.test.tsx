import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test } from "vitest";

import { toast, Toaster } from "@/components/ui/toast";

/** Ids of the toasts a test raised, closed afterwards so none leak across. */
const raised: string[] = [];

/**
 * Raises a toast through the shared manager and waits for it to render.
 *
 * @param options The toast's type and title.
 * @returns The toast's root element.
 */
async function raise(options: { type?: string; title: string }) {
  act(() => {
    raised.push(toast.add(options));
  });
  const title = await screen.findByText(options.title);
  return title.closest<HTMLElement>('[data-slot="toast"]')!;
}

afterEach(() => {
  act(() => raised.splice(0).forEach((id) => toast.close(id)));
});

describe("Toaster", () => {
  test("opts into the design-system palette from its portal", async () => {
    render(<Toaster />);

    const root = await raise({ type: "success", title: "Goals saved." });

    expect(root.closest('[data-slot="toast-viewport"]')).toHaveClass(
      "nutria-theme",
      "tabular-nums",
    );
  });

  test("marks a success with a brand tick and neutral text", async () => {
    render(<Toaster />);

    const root = await raise({ type: "success", title: "Oats added." });

    expect(root.querySelector("svg.lucide-check")).toHaveClass("text-brand");
    expect(root).toHaveAttribute("data-type", "success");
    expect(screen.getByText("Oats added.")).toHaveClass(
      "group-data-[type=error]/toast:text-destructive",
    );
  });

  test("marks an error with a destructive alert icon", async () => {
    render(<Toaster />);

    const root = await raise({ type: "error", title: "Could not sign out." });

    expect(root.querySelector("svg.lucide-circle-alert")).toHaveClass(
      "text-destructive",
    );
    expect(root).toHaveAttribute("data-type", "error");
  });

  test("shows no icon for an untyped toast", async () => {
    render(<Toaster />);

    const root = await raise({ title: "Plain." });

    expect(root.querySelector('[data-slot="toast-icon"]')).toBeNull();
  });

  test("wraps a long unbroken name instead of widening the toast", async () => {
    render(<Toaster />);
    const title = `${"a".repeat(80)} added.`;

    await raise({ type: "success", title });

    expect(screen.getByText(title)).toHaveClass("wrap-anywhere");
  });

  // Base UI hides the button from assistive technology until the toast has
  // focus, which also blanks its accessible name, so it is found by its slot.
  test("can be dismissed with a labelled button", async () => {
    render(<Toaster />);
    const root = await raise({ type: "success", title: "Goals saved." });
    const dismiss = root.querySelector('[data-slot="toast-close"]')!;

    expect(dismiss).toHaveAttribute("aria-label", "Dismiss");
    await userEvent.click(dismiss);

    await waitFor(() =>
      expect(screen.queryByText("Goals saved.")).not.toBeInTheDocument(),
    );
  });

  test("renders no action button unless the toast has one", async () => {
    render(<Toaster />);

    const root = await raise({ type: "success", title: "Goals saved." });

    expect(root.querySelector('[data-slot="toast-action"]')).toBeNull();
  });
});
