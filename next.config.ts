import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  devIndicators: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
