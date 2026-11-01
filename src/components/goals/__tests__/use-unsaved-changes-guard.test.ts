import { afterEach, describe, expect, test } from "vitest";

import { inAppNavigationTarget } from "@/components/goals/use-unsaved-changes-guard";

/** Adds a link with the given attributes and clicks it, returning the target. */
function clickLink(
  attributes: Record<string, string>,
  init: MouseEventInit = {},
) {
  const anchor = document.createElement("a");
  for (const [name, value] of Object.entries(attributes)) {
    anchor.setAttribute(name, value);
  }
  const child = document.createElement("span");
  anchor.append(child);
  document.body.append(anchor);

  const event = new MouseEvent("click", { bubbles: true, ...init });
  let target: string | null = null;
  document.addEventListener(
    "click",
    (clicked) => {
      target = inAppNavigationTarget(clicked);
      clicked.preventDefault();
    },
    { capture: true, once: true },
  );
  child.dispatchEvent(event);

  return target;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("inAppNavigationTarget", () => {
  test("returns the path, query and hash of an in-app link", () => {
    expect(clickLink({ href: "/meals?page=2#top" })).toBe("/meals?page=2#top");
  });

  test("ignores links to other sites", () => {
    expect(clickLink({ href: "https://example.com/meals" })).toBeNull();
  });

  test("ignores links that stay on this page", () => {
    expect(clickLink({ href: window.location.pathname })).toBeNull();
    expect(clickLink({ href: "#section" })).toBeNull();
  });

  test("ignores clicks that open something else", () => {
    expect(clickLink({ href: "/meals", target: "_blank" })).toBeNull();
    expect(clickLink({ href: "/meals", download: "" })).toBeNull();
    expect(clickLink({ href: "/meals" }, { metaKey: true })).toBeNull();
    expect(clickLink({ href: "/meals" }, { ctrlKey: true })).toBeNull();
    expect(clickLink({ href: "/meals" }, { button: 1 })).toBeNull();
  });

  test("ignores clicks outside a link", () => {
    const event = new MouseEvent("click");
    Object.defineProperty(event, "target", { value: document.body });

    expect(inAppNavigationTarget(event)).toBeNull();
  });
});
