import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, vi } from "vitest";

// Next.js renders with its own bundled React, which exports `ViewTransition`;
// the `react` package the tests resolve to doesn't yet. The stub renders its
// children and records its props, so tests can check what it was given.
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  ViewTransition: vi.fn(({ children }: { children?: ReactNode }) => children),
}));

// Base UI's own escape hatch: the dialogs would otherwise wait on
// `element.getAnimations()`, which jsdom does not implement. Base UI ships
// `global.d.ts` for it, but does not export that subpath, so it is set here.
(globalThis as Record<string, unknown>).BASE_UI_ANIMATIONS_DISABLED = true;

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (typeof globalThis.matchMedia === "undefined") {
  globalThis.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// `globals` stays off, so the suite imports `describe`/`test`/`vi` from
// `vitest`; the unmount after each test is set up here for the same reason.
afterEach(cleanup);
