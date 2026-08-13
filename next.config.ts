import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle so the Docker image stays small.
  output: "standalone",
  serverExternalPackages: ["pg"],
};

export default nextConfig;
