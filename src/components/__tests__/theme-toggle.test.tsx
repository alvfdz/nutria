import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";

import { ThemeToggle } from "@/components/theme-toggle";
import { themeStorageKey } from "@/lib/theme";

beforeEach(() => {
  document.documentElement.classList.remove("dark");
  window.localStorage.clear();
});

describe("ThemeToggle", () => {
  test("re-applies the stored theme on mount", () => {
    window.localStorage.setItem(themeStorageKey, "dark");

    render(<ThemeToggle />);

    expect(document.documentElement).toHaveClass("dark");
  });

  test("leaves the document alone when nothing valid is stored", () => {
    window.localStorage.setItem(themeStorageKey, "neon");

    render(<ThemeToggle />);

    expect(document.documentElement).not.toHaveClass("dark");
  });

  test("switches to dark and remembers the choice", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("button", { name: "Toggle theme" }));

    expect(document.documentElement).toHaveClass("dark");
    expect(window.localStorage.getItem(themeStorageKey)).toBe("dark");
  });

  test("switches back to light", async () => {
    const user = userEvent.setup();
    document.documentElement.classList.add("dark");
    window.localStorage.setItem(themeStorageKey, "dark");
    render(<ThemeToggle />);

    await user.click(screen.getByRole("button", { name: "Toggle theme" }));

    expect(document.documentElement).not.toHaveClass("dark");
    expect(window.localStorage.getItem(themeStorageKey)).toBe("light");
  });
});
