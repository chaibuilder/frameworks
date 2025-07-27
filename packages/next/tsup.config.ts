import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/builder/index.tsx",
    "src/server/index.ts",
    "src/utils/index.ts",
    "src/core/index.tsx",
    "src/config/index.ts",
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
  ],
  minify: false,
  sourcemap: false,
  outExtension({ format }) {
    return {
      js: format === "cjs" ? ".cjs" : ".js",
    };
  },
});
