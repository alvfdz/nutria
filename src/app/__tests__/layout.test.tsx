import { isValidElement, type ReactElement, type ReactNode } from "react";
import { headers } from "next/headers";
import { beforeEach, describe, expect, test, vi } from "vitest";

import RootLayout from "@/app/layout";
import { themeScript } from "@/lib/theme";

vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "font-sans" }),
  Geist_Mono: () => ({ variable: "font-mono" }),
}));
vi.mock("@/components/ui/toast", () => ({ Toaster: () => null }));

type Props = { children?: ReactNode; [key: string]: unknown };

/**
 * Finds the first element of a type in a tree without rendering it, since
 * `<html>` cannot be mounted inside the test document.
 */
function findElement(
  node: ReactNode,
  type: string,
): ReactElement<Props> | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, type);
      if (found) return found;
    }
    return null;
  }
  if (!isValidElement<Props>(node)) return null;
  if (node.type === type) return node;

  return findElement(node.props.children, type);
}

/** Renders the layout with the request headers given. */
async function renderLayout(requestHeaders: Record<string, string>) {
  vi.mocked(headers).mockResolvedValue(new Headers(requestHeaders) as never);

  return RootLayout({
    children: <p>Page</p>,
    params: Promise.resolve({}),
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RootLayout", () => {
  test("gives the theme script the request's CSP nonce", async () => {
    const tree = await renderLayout({ "x-nonce": "abc123" });

    const script = findElement(tree, "script");
    expect(script?.props.nonce).toBe("abc123");
    expect(script?.props.dangerouslySetInnerHTML).toEqual({
      __html: themeScript,
    });
  });

  test("leaves the nonce off when the proxy did not run", async () => {
    const tree = await renderLayout({});

    expect(findElement(tree, "script")?.props.nonce).toBeUndefined();
  });

  test("renders the page inside the body", async () => {
    const tree = await renderLayout({});

    const body = findElement(tree, "body");
    expect(findElement(body?.props.children, "p")?.props.children).toBe("Page");
  });
});
