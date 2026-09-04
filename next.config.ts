import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : 'standalone',
  /* config options here */
};

export default nextConfig;
