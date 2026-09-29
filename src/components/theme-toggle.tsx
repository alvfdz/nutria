"use client";

import { Moon, Sun } from "lucide-react";
import { useLayoutEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  applyTheme,
  isDarkMode,
  readStoredTheme,
  storeTheme,
  type Theme,
} from "@/lib/theme";

/** Switches between the light and dark themes and persists the choice. */
export function ThemeToggle() {
  // React's Strict Mode remount resets <html> to the attributes it manages from
  // JSX in development, dropping the class the inline script set. Re-apply the
  // stored preference before paint. A no-op in production.
  useLayoutEffect(() => {
    const stored = readStoredTheme();
    if (stored) applyTheme(stored);
  }, []);

  function toggle() {
    const next: Theme = isDarkMode() ? "light" : "dark";
    applyTheme(next);
    storeTheme(next);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Toggle theme"
    >
      <Moon className="dark:hidden" />
      <Sun className="hidden dark:block" />
    </Button>
  );
}
