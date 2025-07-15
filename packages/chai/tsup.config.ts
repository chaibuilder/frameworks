import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx"],
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
});
