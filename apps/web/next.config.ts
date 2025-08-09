import { withChaiBuilder } from "chai-next/config";
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
};
export default withChaiBuilder(nextConfig) as NextConfig;