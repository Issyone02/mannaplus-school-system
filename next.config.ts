import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,  // ✅ Removes "X-Powered-By: Next.js" header
  reactStrictMode: true,
};

export default nextConfig;