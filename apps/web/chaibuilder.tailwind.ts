import { getChaiBuilderTailwindConfig } from "chai-next/utils";
export default getChaiBuilderTailwindConfig([
  "./app/(chaibuilder)/**/*.{js,ts,jsx,tsx,mdx}",
  "./node_modules/chai-next/dist/**/*.{js,cjs}",
]);
