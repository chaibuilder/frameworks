import { withChaiBuilder } from "chai-next/config";
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ucarecdn.com" },
      { protocol: "https", hostname: "via.placeholder.com" },
    ],
  },
};
export default withChaiBuilder(nextConfig) as NextConfig;
