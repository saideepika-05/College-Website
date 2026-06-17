import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server to be reached through a Cloudflare quick tunnel
  // (used to share localhost with remote testers).
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
