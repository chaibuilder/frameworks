import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/server/index.ts",
    "src/utils/index.ts",
    "src/blocks/index.tsx",
    "src/blocks/rsc/index.tsx",
    "src/core/index.tsx",
    "src/config/index.ts",
    "src/classes.ts",
  ],
  target: "es2018",
  esbuildOptions(options) {
    options.loader = {
      ...options.loader,
      ".tsx": "tsx",
    };
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  external: [
    "react",
    "react-dom",
    "next",
    "@chaibuilder/pages",
    "@chaibuilder/sdk",
    "@ai-sdk/openai",
    "@supabase/ssr",
    "@supabase/supabase-js",
    "@tailwindcss/aspect-ratio",
    "@tailwindcss/container-queries",
    "@tailwindcss/forms",
    "@tailwindcss/typography",
    "ai",
    "chalk",
    "date-fns",
    "lodash",
    "postcss",
    "raw-loader",
    "sharp",
    "tailwindcss",
    "tailwindcss-animate",
    "zod",
  ],
  minify: true,
  sourcemap: false,
  outExtension({ format }) {
    return {
      js: format === "cjs" ? ".cjs" : ".js",
    };
  },
});
