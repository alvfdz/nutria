import { describe, expect, test } from "vitest";

import { IMAGE_HOST_SUFFIXES } from "@/lib/foodfacts/mapping";
import { buildContentSecurityPolicy, createNonce } from "@/lib/security/csp";

/** Splits a policy into a directive-name → value map. */
function directives(policy: string): Map<string, string> {
  return new Map(
    policy.split("; ").map((directive) => {
      const [name, ...values] = directive.split(" ");
      return [name, values.join(" ")];
    }),
  );
}

describe("createNonce", () => {
  test("encodes 128 random bits as base64", () => {
    expect(createNonce()).toMatch(/^[A-Za-z0-9+/]{22}==$/);
  });

  test("differs on every call", () => {
    const nonces = new Set(Array.from({ length: 50 }, createNonce));

    expect(nonces.size).toBe(50);
  });
});

describe("buildContentSecurityPolicy", () => {
  test("lets only scripts carrying the nonce run", () => {
    const policy = directives(buildContentSecurityPolicy("abc"));

    expect(policy.get("script-src")).toBe(
      "'self' 'nonce-abc' 'strict-dynamic'",
    );
  });

  test("adds 'unsafe-eval' in development only", () => {
    const dev = directives(buildContentSecurityPolicy("abc", { dev: true }));

    expect(dev.get("script-src")).toContain("'unsafe-eval'");
    expect(
      directives(buildContentSecurityPolicy("abc")).get("script-src"),
    ).not.toContain("'unsafe-eval'");
  });

  test("forbids framing, plugins and foreign form targets", () => {
    const policy = directives(buildContentSecurityPolicy("abc"));

    expect(policy.get("frame-ancestors")).toBe("'none'");
    expect(policy.get("object-src")).toBe("'none'");
    expect(policy.get("form-action")).toBe("'self'");
    expect(policy.get("base-uri")).toBe("'self'");
    expect(policy.get("default-src")).toBe("'self'");
    expect(policy.get("connect-src")).toBe("'self'");
  });

  test("allows thumbnails from every host the search mapping accepts", () => {
    const images = directives(buildContentSecurityPolicy("abc"))
      .get("img-src")!
      .split(" ");

    for (const suffix of IMAGE_HOST_SUFFIXES) {
      expect(images).toContain(`https://${suffix}`);
      expect(images).toContain(`https://*.${suffix}`);
    }
    expect(images).toContain("https://*.openfoodfacts.org");
  });

  test("does not upgrade requests, so plain-HTTP instances keep working", () => {
    expect(buildContentSecurityPolicy("abc")).not.toContain(
      "upgrade-insecure-requests",
    );
  });
});
