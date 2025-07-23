import { getChaiBuilderTailwindConfig } from "chai-next/utils";
export default getChaiBuilderTailwindConfig([
  "./app/**/*.{js,ts,jsx,tsx,mdx}",
  "./node_modules/chai-next/node_modules/@chaibuilder/sdk/dist/**/*.{js,cjs}",
  "./node_modules/chai-next/node_modules/@chaibuilder/pages/dist/**/*.{js,cjs}",
]);
