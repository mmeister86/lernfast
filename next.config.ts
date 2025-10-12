import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ESM Support für better-auth-harmony (validator.js Package)
  transpilePackages: ["better-auth-harmony"],

  // Experimental Features für optimiertes Caching (Next.js 15)
  experimental: {
    // staleTimes definiert, wie lange gecachte Daten als "frisch" gelten
    staleTimes: {
      dynamic: 30, // 30 Sekunden für dynamische Pages (z.B. Dashboard)
      static: 180, // 3 Minuten für statische Pages
    },
  },
};

export default nextConfig;
