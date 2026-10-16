"use client";

import { useSyncExternalStore, type CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Observes the `dark` class on `<html>` — the app's single source of truth
 * for the theme (see `@/lib/theme`) — so subscribers re-render whenever the
 * header toggle flips it.
 *
 * @param onChange Called after each change to the class attribute.
 * @returns A cleanup that stops the observer.
 */
function subscribeToTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  return () => observer.disconnect();
}

/** @returns The theme currently applied to `<html>`. */
function readTheme(): "light" | "dark" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * Theme snapshot used while server rendering, where `<html>` carries no class
 * yet: the inline theme script applies it on the client before hydration.
 *
 * @returns Always `"light"`; the client snapshot corrects it right after
 * hydration without a mismatch warning.
 */
function readServerTheme(): "light" | "dark" {
  return "light";
}

/**
 * The app's toast container. Wraps sonner's `Toaster` and paints it with the
 * theme's popover tokens, so toasts sit on the same surface look as dialogs
 * and popovers in both light and dark mode, following theme changes live.
 * Mount it once in the root layout and trigger toasts from anywhere with
 * `toast` (from `sonner`).
 *
 * @param props Standard sonner props, forwarded verbatim (e.g. `position`).
 * @returns The rendered toast container.
 */
export function Toaster(props: ToasterProps) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    readTheme,
    readServerTheme,
  );

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as CSSProperties
      }
      {...props}
    />
  );
}
