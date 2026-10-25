import { NextRequest } from "next/server";
import { describe, expect, test } from "vitest";

import { config, proxy } from "@/proxy";

/** Builds a request, optionally carrying Better Auth's session cookie. */
function request(path: string, { signedIn = false } = {}) {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    headers: signedIn
      ? { cookie: "better-auth.session_token=token.signature" }
      : {},
  });
}

/** True when the response passes the request through to the route. */
function passesThrough(response: Response) {
  return response.headers.get("x-middleware-next") === "1";
}

describe("proxy", () => {
  test("lets a request with a session cookie through", () => {
    expect(passesThrough(proxy(request("/calendar", { signedIn: true })))).toBe(
      true,
    );
  });

  test.each(["/login", "/setup"])(
    "lets a signed-out visitor open %s",
    (path) => {
      expect(passesThrough(proxy(request(path)))).toBe(true);
    },
  );

  test("redirects a signed-out page request to the login screen", () => {
    const response = proxy(request("/calendar?week=2026-10-19"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/calendar?week=2026-10-19");
  });

  test("leaves `next` off when the visitor was heading home", () => {
    const response = proxy(request("/"));

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login",
    );
  });

  test("answers a signed-out API request with a 401 instead", async () => {
    const response = proxy(request("/api/foodfacts/search?q=milk"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  test("skips Better Auth's endpoints, build assets and public files", () => {
    const [matcher] = config.matcher;
    const pattern = new RegExp(`^${matcher}$`);

    expect(pattern.test("/calendar")).toBe(true);
    expect(pattern.test("/api/foodfacts/search")).toBe(true);
    expect(pattern.test("/api/auth/sign-in/email")).toBe(false);
    expect(pattern.test("/api/authors")).toBe(true);
    expect(pattern.test("/api/auth-export")).toBe(true);
    expect(pattern.test("/_next/static/chunk.js")).toBe(false);
    expect(pattern.test("/favicon.ico")).toBe(false);
  });
});
