"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

/**
 * Works out where a click would navigate within the app, if anywhere. Clicks the
 * browser handles by opening something else, such as a new tab, return `null`
 * because they leave the form as it is.
 *
 * @param event The click.
 * @returns The in-app path being followed, or `null` when the click is not an
 * in-app navigation to a different page.
 */
export function inAppNavigationTarget(event: MouseEvent): string | null {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return null;
  }

  const anchor =
    event.target instanceof Element
      ? event.target.closest<HTMLAnchorElement>("a[href]")
      : null;
  if (!anchor || anchor.hasAttribute("download")) return null;
  if (anchor.target && anchor.target !== "_self") return null;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  if (
    url.pathname === window.location.pathname &&
    url.search === window.location.search
  ) {
    return null;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

/** What {@link useUnsavedChangesGuard} hands back to the form. */
export type UnsavedChangesGuard = {
  /** The in-app path waiting on a decision, or `null` when nothing is. */
  pendingHref: string | null;
  /** Abandons the pending navigation and stays on the form. */
  stay: () => void;
  /** Follows the pending navigation, discarding the edits. */
  leave: () => void;
};

/**
 * Stops unsaved edits from being lost by accident. While `dirty`, closing or
 * reloading the tab raises the browser's own prompt, and following an in-app
 * link is held back until the caller asks the user what to do. The browser's
 * back and forward buttons are not intercepted.
 *
 * @param dirty Whether the form has unsaved edits.
 * @returns The pending navigation and the two ways to settle it.
 */
export function useUnsavedChangesGuard(dirty: boolean): UnsavedChangesGuard {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    // Capture phase, so this runs before Next's `Link` starts the navigation.
    const onClick = (event: MouseEvent) => {
      const href = inAppNavigationTarget(event);
      if (!href) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(href);
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  return {
    pendingHref,
    stay: () => setPendingHref(null),
    leave: () => {
      if (pendingHref) router.push(pendingHref);
      setPendingHref(null);
    },
  };
}
