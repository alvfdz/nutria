import { describe, expect, test } from "vitest";

import { DEFAULT_SIGNED_IN_PATH, safeNextPath } from "@/lib/auth/redirect";

describe("safeNextPath", () => {
  test.each(["/calendar", "/calendar?week=2026-10-19", "/meals#new", "/"])(
    "keeps the same-origin path %s",
    (path) => {
      expect(safeNextPath(path)).toBe(path);
    },
  );

  test.each([
    ["a missing value", undefined],
    ["a non-string value", ["/calendar"]],
    ["an empty string", ""],
    ["an absolute URL", "https://evil.example/"],
    ["a protocol-relative URL", "//evil.example/"],
    ["a backslash host", "/\\evil.example"],
    ["a relative path", "calendar"],
    ["a control character", "/calendar\n"],
    ["the login screen", "/login"],
    ["the login screen with a query", "/login?next=/meals"],
    ["the setup screen", "/setup"],
  ])("falls back to the default for %s", (_label, value) => {
    expect(safeNextPath(value)).toBe(DEFAULT_SIGNED_IN_PATH);
  });

  test("does not mistake a page that starts with an auth path", () => {
    expect(safeNextPath("/logins")).toBe("/logins");
  });
});
