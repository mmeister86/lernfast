import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ESM Support für better-auth-harmony (validator.js Package)
  transpilePackages: ["better-auth-harmony"],
};

export default nextConfig;
