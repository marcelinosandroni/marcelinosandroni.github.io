import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
  experimental: {
    // The root layout lives under the `[locale]` dynamic segment, so a global
    // 404 is the only way to render a consistent "page not found" page for
    // URLs that match no locale at all.
    globalNotFound: true,
  },
};

export default nextConfig;
