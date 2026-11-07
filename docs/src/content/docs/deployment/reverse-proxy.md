---
title: Reverse proxy
description: Serve Nutria over HTTPS behind Caddy, Traefik or nginx.
sidebar:
  order: 2
---

Nutria serves plain HTTP. To reach it over HTTPS or from outside your network, put a reverse proxy in front of it.

## Sign-in rate limit

Sign-in allows 3 attempts per 10 seconds, per client address. Served directly, Nutria reads the client address from the connection. Behind a proxy every connection comes from the proxy, so all clients would share one sign-in allowance. Tell Nutria which proxies to trust so it limits each client on its own.

## Setup

1. **Set `TRUSTED_PROXIES`** in `.env` to the address or CIDR range the proxy connects from, as the app container sees it. With several proxies in a row (say a CDN, then Caddy), list them all, comma-separated:

   ```bash
   TRUSTED_PROXIES=10.89.0.0/24
   ```

   The container refuses to start if an entry is not an IP address or CIDR range.

2. **Forward the client address** in `X-Forwarded-For`. Caddy and Traefik do it by default. nginx needs:

   ```nginx
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   ```

3. **Send `Strict-Transport-Security`** from the proxy. Nutria doesn't, since it may be served over plain HTTP on a local network.

4. **Set `BETTER_AUTH_URL`** to the public HTTPS address, e.g. `https://nutria.example.com`, and restart:

   ```bash
   docker compose up -d --wait
   ```

:::tip
Leaving the app port open next to the proxy doesn't weaken the limit: a client that reaches the app directly is still limited by its own address.
:::

### Example: Caddy

```txt title="Caddyfile"
nutria.example.com {
  reverse_proxy localhost:3000
  header Strict-Transport-Security "max-age=31536000"
}
```
