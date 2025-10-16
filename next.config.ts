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

  // Webpack-Override für Better-Auth Dependency
  // Fix: Verhindert "Cannot find module '@better-fetch/fetch'" Fehler in Server Actions
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalisiere @better-fetch/fetch für Server Actions
      // Better-Auth verwendet dieses Package intern - Next.js 15 hat Probleme
      // mit dem Vendor Chunk Splitting bei Server Actions
      config.externals = config.externals || [];
      config.externals.push("@better-fetch/fetch");
    }
    return config;
  },
};

export default nextConfig;
