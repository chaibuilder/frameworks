import { withChaiBuilder } from "@chaibuilder/nextjs/config";
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ucarecdn.com" },
      { protocol: "https", hostname: "via.placeholder.com" },
    ],
  },
  serverExternalPackages: ["canvas", "konva", "shiki"],
};
export default withChaiBuilder(nextConfig) as NextConfig;
