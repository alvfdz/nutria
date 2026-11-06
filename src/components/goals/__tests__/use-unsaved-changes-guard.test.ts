import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  inAppNavigationTarget,
  useUnsavedChangesGuard,
} from "@/components/goals/use-unsaved-changes-guard";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

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
  push.mockReset();
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
    expect(clickLink({ href: "/meals" }, { shiftKey: true })).toBeNull();
    expect(clickLink({ href: "/meals" }, { altKey: true })).toBeNull();
    expect(clickLink({ href: "/meals" }, { button: 1 })).toBeNull();
  });

  test("ignores clicks outside a link", () => {
    const event = new MouseEvent("click");
    Object.defineProperty(event, "target", { value: document.body });

    expect(inAppNavigationTarget(event)).toBeNull();
  });

  test("ignores clicks whose target is not an element", () => {
    const event = new MouseEvent("click");
    Object.defineProperty(event, "target", { value: document });

    expect(inAppNavigationTarget(event)).toBeNull();
  });
});

describe("useUnsavedChangesGuard", () => {
  /** Adds an in-app link to the page and returns it. */
  function addLink(href: string) {
    const anchor = document.createElement("a");
    anchor.setAttribute("href", href);
    document.body.append(anchor);
    return anchor;
  }

  test("holds back an in-app link while dirty and follows it on leave", () => {
    const { result } = renderHook(() => useUnsavedChangesGuard(true));
    const link = addLink("/meals");

    act(() => link.click());
    expect(result.current.pendingHref).toBe("/meals");
    expect(push).not.toHaveBeenCalled();

    act(() => result.current.leave());
    expect(push).toHaveBeenCalledWith("/meals");
    expect(result.current.pendingHref).toBeNull();
  });

  test("drops the pending link on stay", () => {
    const { result } = renderHook(() => useUnsavedChangesGuard(true));

    act(() => addLink("/meals").click());
    act(() => result.current.stay());

    expect(result.current.pendingHref).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  test("does nothing on leave when no navigation is pending", () => {
    const { result } = renderHook(() => useUnsavedChangesGuard(true));

    act(() => result.current.leave());

    expect(push).not.toHaveBeenCalled();
    expect(result.current.pendingHref).toBeNull();
  });

  test("lets links through while clean", () => {
    const { result } = renderHook(() => useUnsavedChangesGuard(false));
    const link = addLink("/meals");
    let prevented = true;
    document.addEventListener(
      "click",
      (event) => {
        prevented = event.defaultPrevented;
        event.preventDefault();
      },
      { once: true },
    );

    act(() => link.click());

    expect(prevented).toBe(false);
    expect(result.current.pendingHref).toBeNull();
  });
});
