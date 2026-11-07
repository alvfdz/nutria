import { describe, expect, test } from "vitest";

import nextConfig from "../../../../next.config";
import { SECURITY_HEADERS } from "@/lib/security/headers";

describe("SECURITY_HEADERS", () => {
  const byName = new Map(
    SECURITY_HEADERS.map(({ key, value }) => [key, value]),
  );

  test("sets the baseline hardening headers", () => {
    expect(byName.get("X-Content-Type-Options")).toBe("nosniff");
    expect(byName.get("X-Frame-Options")).toBe("DENY");
    expect(byName.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(byName.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
    expect(byName.get("Permissions-Policy")).toContain("camera=()");
  });

  test("leaves the CSP to the proxy and HSTS to the TLS proxy", () => {
    expect(byName.has("Content-Security-Policy")).toBe(false);
    expect(byName.has("Strict-Transport-Security")).toBe(false);
  });
});

describe("next.config", () => {
  test("sends the security headers on every path", async () => {
    const rules = await nextConfig.headers!();

    expect(rules).toEqual([
      { source: "/:path*", headers: [...SECURITY_HEADERS] },
    ]);
  });

  test("drops the X-Powered-By header", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
