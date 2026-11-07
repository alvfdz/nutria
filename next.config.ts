import type { NextConfig } from "next";

import { SECURITY_HEADERS } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Emits a self-contained server in `.next/standalone` for the Docker image.
  output: "standalone",
  // No `X-Powered-By: Next.js`: it only tells a scanner what to probe for.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [...SECURITY_HEADERS] }];
  },
};

export default nextConfig;
