import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: dir,
  },
  experimental: {
    serverActions: {
      /** Avoid 413 on FormData-heavy actions if ever used */
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
