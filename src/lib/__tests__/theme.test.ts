import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  applyTheme,
  isDarkMode,
  isTheme,
  readStoredTheme,
  storeTheme,
  themeScript,
  themeStorageKey,
} from "@/lib/theme";

beforeEach(() => {
  document.documentElement.classList.remove("dark");
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("isTheme", () => {
  test.each(["light", "dark"])("accepts %s", (value) => {
    expect(isTheme(value)).toBe(true);
  });

  test.each(["Light", "DARK", "", "system", null, undefined, 1])(
    "rejects %s",
    (value) => {
      expect(isTheme(value)).toBe(false);
    },
  );
});

describe("readStoredTheme", () => {
  test.each(["light", "dark"] as const)(
    "reads the stored %s theme",
    (theme) => {
      window.localStorage.setItem(themeStorageKey, theme);
      expect(readStoredTheme()).toBe(theme);
    },
  );

  test("returns null when nothing is stored", () => {
    expect(readStoredTheme()).toBeNull();
  });

  test("returns null for a value that is not a theme", () => {
    window.localStorage.setItem(themeStorageKey, "neon");
    expect(readStoredTheme()).toBeNull();
  });

  test("returns null when localStorage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(readStoredTheme()).toBeNull();
  });
});

describe("applyTheme", () => {
  test("adds the dark class for the dark theme", () => {
    applyTheme("dark");
    expect(document.documentElement).toHaveClass("dark");
  });

  test("removes the dark class for the light theme", () => {
    applyTheme("dark");
    applyTheme("light");
    expect(document.documentElement).not.toHaveClass("dark");
  });
});

describe("isDarkMode", () => {
  test("reflects the class on the document element", () => {
    expect(isDarkMode()).toBe(false);

    applyTheme("dark");
    expect(isDarkMode()).toBe(true);

    applyTheme("light");
    expect(isDarkMode()).toBe(false);
  });
});

describe("storeTheme", () => {
  test("persists the choice under the shared storage key", () => {
    storeTheme("dark");
    expect(window.localStorage.getItem(themeStorageKey)).toBe("dark");

    storeTheme("light");
    expect(window.localStorage.getItem(themeStorageKey)).toBe("light");
  });

  test("swallows a failing write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => storeTheme("dark")).not.toThrow();
  });
});

describe("themeScript", () => {
  test("reads and writes the shared storage key", () => {
    expect(themeScript).toContain(JSON.stringify(themeStorageKey));
  });

  test("applies the stored theme before the first paint", () => {
    window.localStorage.setItem(themeStorageKey, "dark");

    new Function(themeScript)();

    expect(document.documentElement).toHaveClass("dark");
  });
});
