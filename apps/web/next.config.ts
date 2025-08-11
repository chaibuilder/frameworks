import { withChaiBuilder } from "chai-next/config";
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ucarecdn.com",
      },
    ],
  },
};
export default withChaiBuilder(nextConfig) as NextConfig;
