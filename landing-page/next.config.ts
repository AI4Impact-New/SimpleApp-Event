import type { NextConfig } from "next";

// Amplify serves the generated static site; local development retains normal Next.js behavior.
const staticHosting = process.env.AMPLIFY_LANDING_EXPORT === "true";
const nextConfig: NextConfig = {
  output: staticHosting ? "export" : undefined,
  trailingSlash: staticHosting,
  images: { unoptimized: staticHosting },
};

export default nextConfig;
