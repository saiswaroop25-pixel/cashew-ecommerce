import type { NextConfig } from "next";
import { PRIVATE_PATHS, privateCacheHeaders, securityHeaders } from "./lib/security/headers";

// Product photos and process media live in Supabase Storage (public buckets). Only that one host,
// and only its public-object path, may be used with next/image.
const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
  } catch {
    return null;
  }
})();

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  poweredByHeader: false, // do not advertise the framework
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders({ isDev, supabaseHost }) },
      ...PRIVATE_PATHS.map((source) => ({ source, headers: privateCacheHeaders })),
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
