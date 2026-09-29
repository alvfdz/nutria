import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

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
