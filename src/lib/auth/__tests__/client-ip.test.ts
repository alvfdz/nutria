// @vitest-environment node
import http, { type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, test } from "vitest";

import {
  CLIENT_IP_HEADER,
  installClientIpHeader,
  parseTrustedProxies,
  resolveClientIp,
  tagClientIp,
} from "@/lib/auth/client-ip";

const none = parseTrustedProxies(undefined);

describe("parseTrustedProxies", () => {
  test.each([undefined, "", "  ", " , "])(
    "trusts nothing when the setting is %j",
    (value) => {
      const trusted = parseTrustedProxies(value);

      expect(trusted.entries).toEqual([]);
      expect(trusted.includes("10.0.0.1")).toBe(false);
    },
  );

  test("accepts IPv4 and IPv6 addresses and ranges", () => {
    const trusted = parseTrustedProxies("10.0.0.1, 172.16.0.0/12 ::1 fd00::/8");

    expect(trusted.entries).toEqual([
      "10.0.0.1",
      "172.16.0.0/12",
      "::1",
      "fd00::/8",
    ]);
    expect(trusted.includes("10.0.0.1")).toBe(true);
    expect(trusted.includes("10.0.0.2")).toBe(false);
    expect(trusted.includes("172.31.255.255")).toBe(true);
    expect(trusted.includes("172.32.0.0")).toBe(false);
    expect(trusted.includes("::1")).toBe(true);
    expect(trusted.includes("fd12:3456::1")).toBe(true);
    expect(trusted.includes("2001:db8::1")).toBe(false);
  });

  test("matches an IPv4-mapped IPv6 address against an IPv4 entry", () => {
    expect(parseTrustedProxies("10.0.0.0/8").includes("::ffff:10.1.2.3")).toBe(
      true,
    );
  });

  test("accepts an entry written in IPv4-mapped form", () => {
    expect(parseTrustedProxies("::ffff:10.0.0.1").includes("10.0.0.1")).toBe(
      true,
    );
  });

  test("never matches something that is not an address", () => {
    expect(parseTrustedProxies("0.0.0.0/0").includes("unknown")).toBe(false);
  });

  test.each(["0.0.0.0/0", "10.0.0.0/32", "::/0", "fd00::/128"])(
    "accepts the boundary prefix in %s",
    (entry) => {
      expect(parseTrustedProxies(entry).entries).toEqual([entry]);
    },
  );

  test.each([
    "proxy.local",
    "10.0.0.256",
    "10.0.0.0/33",
    "fd00::/129",
    "10.0.0.0/",
    "10.0.0.0/abc",
    "10.0.0.0/8/8",
    "10.0.0.0/-1",
    "fe80::1%eth0",
    "fe80::%eth0/64",
  ])("rejects %s", (entry) => {
    expect(() => parseTrustedProxies(`10.0.0.1,${entry}`)).toThrow(entry);
  });
});

describe("resolveClientIp", () => {
  const proxy = parseTrustedProxies("10.0.0.2");

  test("uses the socket address when no proxy is trusted", () => {
    expect(resolveClientIp("198.51.100.7", undefined, none)).toBe(
      "198.51.100.7",
    );
  });

  test("ignores a forged X-Forwarded-For from a direct client", () => {
    expect(resolveClientIp("198.51.100.7", "203.0.113.1", none)).toBe(
      "198.51.100.7",
    );
    expect(resolveClientIp("198.51.100.7", "203.0.113.1", proxy)).toBe(
      "198.51.100.7",
    );
  });

  test("believes the address a trusted proxy reports", () => {
    expect(resolveClientIp("10.0.0.2", "198.51.100.7", proxy)).toBe(
      "198.51.100.7",
    );
  });

  test("takes the proxy's entry, not the one the client forged before it", () => {
    expect(
      resolveClientIp("10.0.0.2", "203.0.113.1, 198.51.100.7", proxy),
    ).toBe("198.51.100.7");
  });

  test("walks through a chain of trusted proxies", () => {
    const chain = parseTrustedProxies("10.0.0.2, 192.0.2.0/24");

    expect(
      resolveClientIp(
        "10.0.0.2",
        "203.0.113.1, 198.51.100.7, 192.0.2.10",
        chain,
      ),
    ).toBe("198.51.100.7");
  });

  test("stops at the first hop it does not trust", () => {
    // 192.0.2.10 is an untrusted hop in front of the proxy: it is the client
    // as far as Nutria can tell.
    expect(resolveClientIp("10.0.0.2", "198.51.100.7, 192.0.2.10", proxy)).toBe(
      "192.0.2.10",
    );
  });

  test("keeps the proxy when it forwarded no header", () => {
    expect(resolveClientIp("10.0.0.2", undefined, proxy)).toBe("10.0.0.2");
  });

  test("keeps the last trusted hop when it reports garbage", () => {
    expect(resolveClientIp("10.0.0.2", "unknown", proxy)).toBe("10.0.0.2");
  });

  test("unwraps IPv4-mapped addresses", () => {
    expect(resolveClientIp("::ffff:198.51.100.7", undefined, none)).toBe(
      "198.51.100.7",
    );
    expect(
      resolveClientIp("::ffff:10.0.0.2", "::ffff:198.51.100.7", proxy),
    ).toBe("198.51.100.7");
  });

  test("ignores empty entries in the chain", () => {
    expect(resolveClientIp("10.0.0.2", "198.51.100.7, ,", proxy)).toBe(
      "198.51.100.7",
    );
  });
});

/** Builds the slice of an `IncomingMessage` that `tagClientIp` touches. */
function fakeRequest(
  headers: Record<string, string | string[]>,
  remoteAddress: string | undefined,
): IncomingMessage {
  return {
    headers: { ...headers },
    rawHeaders: Object.entries(headers).flatMap(([key, value]) => [
      key,
      String(value),
    ]),
    socket: { remoteAddress },
  } as unknown as IncomingMessage;
}

describe("tagClientIp", () => {
  test("replaces a client-supplied copy of the header", () => {
    const request = fakeRequest(
      { [CLIENT_IP_HEADER]: "203.0.113.1", host: "nutria" },
      "198.51.100.7",
    );
    request.rawHeaders.splice(0, 1, "X-Nutria-Client-IP");

    tagClientIp(request, none);

    expect(request.headers[CLIENT_IP_HEADER]).toBe("198.51.100.7");
    expect(request.rawHeaders).toEqual(["host", "nutria"]);
  });

  test("reads X-Forwarded-For through a trusted proxy", () => {
    const request = fakeRequest(
      { "x-forwarded-for": "198.51.100.7" },
      "10.0.0.2",
    );

    tagClientIp(request, parseTrustedProxies("10.0.0.2"));

    expect(request.headers[CLIENT_IP_HEADER]).toBe("198.51.100.7");
  });

  test("joins a repeated X-Forwarded-For header", () => {
    const request = fakeRequest(
      { "x-forwarded-for": ["203.0.113.1", "198.51.100.7"] },
      "10.0.0.2",
    );

    tagClientIp(request, parseTrustedProxies("10.0.0.2"));

    expect(request.headers[CLIENT_IP_HEADER]).toBe("198.51.100.7");
  });

  test("leaves the header off when the socket has no address", () => {
    const request = fakeRequest(
      { [CLIENT_IP_HEADER]: "203.0.113.1" },
      undefined,
    );

    tagClientIp(request, none);

    expect(request.headers[CLIENT_IP_HEADER]).toBeUndefined();
    expect(request.rawHeaders).toEqual([]);
  });
});

describe("installClientIpHeader", () => {
  let uninstall: (() => void) | undefined;
  let server: http.Server | undefined;

  afterEach(async () => {
    uninstall?.();
    uninstall = undefined;
    await new Promise((resolve) => server?.close(resolve) ?? resolve(null));
    server = undefined;
  });

  /** Starts a server that echoes the client header it sees. */
  async function startEchoServer() {
    server = http.createServer((request, response) => {
      response.end(String(request.headers[CLIENT_IP_HEADER] ?? "none"));
    });
    await new Promise<void>((resolve) =>
      server!.listen(0, "127.0.0.1", resolve),
    );
    const { port } = server.address() as AddressInfo;
    return `http://127.0.0.1:${port}/`;
  }

  test("stamps the real peer address over a forged header", async () => {
    uninstall = installClientIpHeader(none, http.Server.prototype);
    const url = await startEchoServer();

    const response = await fetch(url, {
      headers: {
        [CLIENT_IP_HEADER]: "203.0.113.1",
        "x-forwarded-for": "203.0.113.2",
      },
    });

    expect(await response.text()).toBe("127.0.0.1");
  });

  test("believes X-Forwarded-For only from a trusted peer", async () => {
    uninstall = installClientIpHeader(
      parseTrustedProxies("127.0.0.1"),
      http.Server.prototype,
    );
    const url = await startEchoServer();

    const response = await fetch(url, {
      headers: { "x-forwarded-for": "198.51.100.7" },
    });

    expect(await response.text()).toBe("198.51.100.7");
  });

  test("passes other events through and can be removed", async () => {
    const original = http.Server.prototype.emit;
    uninstall = installClientIpHeader(none, http.Server.prototype);
    expect(http.Server.prototype.emit).not.toBe(original);

    const url = await startEchoServer();
    expect(server!.listening).toBe(true);

    uninstall();
    uninstall = undefined;
    expect(http.Server.prototype.emit).toBe(original);

    const response = await fetch(url, {
      headers: { [CLIENT_IP_HEADER]: "203.0.113.1" },
    });
    expect(await response.text()).toBe("203.0.113.1");
  });
});
