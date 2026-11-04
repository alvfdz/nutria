import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { HelpPopover } from "@/components/help-popover";

const renderHelp = () =>
  render(
    <HelpPopover label="About the calorie target" title="Choosing a target">
      <p>Ask a dietitian.</p>
    </HelpPopover>,
  );

describe("HelpPopover", () => {
  test("renders a labelled button and keeps the note closed", () => {
    renderHelp();

    expect(
      screen.getByRole("button", { name: "About the calorie target" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Ask a dietitian.")).not.toBeInTheDocument();
  });

  test("opens the note on click, with its title and text", async () => {
    const user = userEvent.setup();
    renderHelp();

    await user.click(
      screen.getByRole("button", { name: "About the calorie target" }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAccessibleName("Choosing a target");
    expect(screen.getByText("Ask a dietitian.")).toBeInTheDocument();
  });

  test("closes the note on Escape", async () => {
    const user = userEvent.setup();
    renderHelp();

    await user.click(
      screen.getByRole("button", { name: "About the calorie target" }),
    );
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByText("Ask a dietitian.")).not.toBeInTheDocument(),
    );
  });

  test("is a non-submitting button, so it is safe inside a form", () => {
    renderHelp();

    expect(
      screen.getByRole("button", { name: "About the calorie target" }),
    ).toHaveAttribute("type", "button");
  });
});
