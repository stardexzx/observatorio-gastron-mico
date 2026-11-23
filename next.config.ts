import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  outputFileTracingIncludes: {
    "/recetario": ["./assets/recetarios/*.pdf"],
    "/api/recetarios/*": ["./assets/recetarios/*.pdf"],
    "/api/admin/recetarios/*": ["./assets/recetarios/*.pdf"],
  },
};

export default nextConfig;
