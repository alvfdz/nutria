import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Emits a self-contained server in `.next/standalone` for the Docker image.
  output: "standalone",
};

export default nextConfig;
