import type { IncomingMessage, Server } from "node:http";
import { BlockList, isIP } from "node:net";

/**
 * Request header carrying the client address, as resolved by
 * {@link installClientIpHeader} from the connection itself. Better Auth
 * rate-limits sign-in by it. The hook overwrites it on every request, so a
 * client cannot supply its own; when the hook is not installed (`next dev`,
 * `next start`) the header is absent and Better Auth falls back to one shared
 * bucket in production.
 */
export const CLIENT_IP_HEADER = "x-nutria-client-ip";

/** `::ffff:192.0.2.1`, the form a dual-stack socket reports IPv4 peers in. */
const IPV4_MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

/**
 * Turns an IPv4-mapped IPv6 address into plain IPv4, so the same client is
 * the same key whichever form the socket or a proxy reports it in.
 *
 * @param address An address, as reported by a socket or a proxy.
 * @returns The address, with the mapping prefix removed when it had one.
 */
function unmap(address: string): string {
  return IPV4_MAPPED.exec(address)?.[1] ?? address;
}

/**
 * Parses one `TRUSTED_PROXIES` entry into a {@link BlockList} rule.
 *
 * @param entry An address or CIDR range, e.g. `10.0.0.1` or `172.16.0.0/12`.
 * @param list The list to add the rule to.
 * @returns `false` when the entry is invalid. IPv6 zone ids (`fe80::1%eth0`)
 * are refused: a forwarded address never carries one.
 */
function addEntry(entry: string, list: BlockList): boolean {
  const [rawAddress, prefix, ...rest] = entry.split("/");
  const address = unmap(rawAddress);
  const version = isIP(address);

  if (version === 0 || rest.length > 0 || address.includes("%")) return false;

  const type = version === 4 ? "ipv4" : "ipv6";
  if (prefix === undefined) {
    list.addAddress(address, type);
    return true;
  }

  if (!/^\d{1,3}$/.test(prefix)) return false;
  const bits = Number(prefix);
  if (bits > (version === 4 ? 32 : 128)) return false;

  list.addSubnet(address, bits, type);
  return true;
}

/** The parsed `TRUSTED_PROXIES` setting. */
export interface TrustedProxies {
  /** The entries, as given. */
  entries: string[];
  /**
   * Whether an address belongs to a trusted proxy.
   *
   * @param address An IPv4 or IPv6 address.
   * @returns `true` when it matches an entry.
   */
  includes(address: string): boolean;
}

/**
 * Parses the `TRUSTED_PROXIES` setting: a comma- or space-separated list of
 * the addresses or CIDR ranges of the reverse proxies in front of Nutria.
 *
 * @param value Raw setting; unset or blank trusts no proxy.
 * @returns The trusted proxies.
 * @throws {Error} If an entry is not an IP address or CIDR range, so a typo
 * stops the server from starting instead of silently trusting nothing.
 */
export function parseTrustedProxies(value: string | undefined): TrustedProxies {
  const entries = (value ?? "").split(/[\s,]+/).filter(Boolean);
  const list = new BlockList();
  const invalid = entries.filter((entry) => !addEntry(entry, list));

  if (invalid.length > 0) {
    throw new Error(
      `TRUSTED_PROXIES has entries that are not an IP address or CIDR range: ${invalid.join(", ")}.`,
    );
  }

  return {
    entries,
    includes(address) {
      const plain = unmap(address);
      const version = isIP(plain);
      if (version === 0) return false;
      return list.check(plain, version === 4 ? "ipv4" : "ipv6");
    },
  };
}

/**
 * Works out the client address of a request from the connection and the
 * `X-Forwarded-For` chain.
 *
 * The socket address is the one thing a client cannot forge, so the walk
 * starts there. While the current hop is a trusted proxy, the address it
 * reported (the next entry from the right of `X-Forwarded-For`) is believed
 * and the walk moves on; the first untrusted hop is the client. With no
 * trusted proxies, that is always the socket itself, and the header is
 * never read.
 *
 * @param socketAddress The peer address of the connection.
 * @param forwardedFor The `X-Forwarded-For` header, if any.
 * @param trusted Proxies whose reports are believed.
 * @returns The client address. When a trusted hop reports something that is
 * not an address, that hop itself is returned rather than the garbage.
 */
export function resolveClientIp(
  socketAddress: string,
  forwardedFor: string | undefined,
  trusted: TrustedProxies,
): string {
  const chain = (forwardedFor ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  let client = unmap(socketAddress);

  while (trusted.includes(client) && chain.length > 0) {
    const reported = unmap(chain.pop()!);
    if (isIP(reported) === 0) break;
    client = reported;
  }

  return client;
}

/**
 * Stamps {@link CLIENT_IP_HEADER} on a request, replacing any copy the
 * client sent.
 *
 * @param request The incoming request.
 * @param trusted Proxies whose `X-Forwarded-For` reports are believed.
 */
export function tagClientIp(
  request: IncomingMessage,
  trusted: TrustedProxies,
): void {
  const forwarded = request.headers["x-forwarded-for"];
  const socketAddress = request.socket.remoteAddress;

  // The raw list is what `req.headers` was built from; drop the client's
  // copy there too so nothing downstream can read it.
  for (let index = request.rawHeaders.length - 2; index >= 0; index -= 2) {
    if (request.rawHeaders[index].toLowerCase() === CLIENT_IP_HEADER) {
      request.rawHeaders.splice(index, 2);
    }
  }

  if (!socketAddress) {
    delete request.headers[CLIENT_IP_HEADER];
    return;
  }

  request.headers[CLIENT_IP_HEADER] = resolveClientIp(
    socketAddress,
    Array.isArray(forwarded) ? forwarded.join(",") : forwarded,
    trusted,
  );
}

/**
 * Makes every HTTP server in the process stamp {@link CLIENT_IP_HEADER} on
 * each request before its handlers see it. Next.js offers no hook between
 * the socket and the app, and it only fills `X-Forwarded-For` from the
 * socket when the client did not send one, so the app cannot otherwise tell
 * the connection's real address from a forged header.
 *
 * The container's entrypoint (`scripts/serve.ts`) installs it and then
 * starts the standalone server.
 *
 * @param trusted Proxies whose `X-Forwarded-For` reports are believed.
 * @param serverPrototype Prototype to patch; Node's `http.Server` in
 * production, injectable for tests.
 * @returns A function that removes the hook.
 */
export function installClientIpHeader(
  trusted: TrustedProxies,
  serverPrototype: Pick<Server, "emit">,
): () => void {
  const originalEmit = serverPrototype.emit;

  serverPrototype.emit = function emit(
    this: Server,
    event: string | symbol,
    ...args: unknown[]
  ) {
    if (event === "request") tagClientIp(args[0] as IncomingMessage, trusted);
    return Reflect.apply(originalEmit, this, [event, ...args]) as boolean;
  } as Server["emit"];

  return () => {
    serverPrototype.emit = originalEmit;
  };
}
