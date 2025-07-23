import * as fs from "node:fs";
import * as path from "node:path";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["client/index.tsx", "server/index.ts", "styles/index.ts"],
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
  async onSuccess() {
    // Copy CSS file to the dist directory
    const srcCssPath = path.join(process.cwd(), "styles", "pages.css");
    const destCssPath = path.join(process.cwd(), "dist", "styles", "pages.css");

    // Create the directory if it doesn't exist
    const destDir = path.dirname(destCssPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Copy the file
    fs.copyFileSync(srcCssPath, destCssPath);
    console.log("CSS file copied to dist directory");
  },
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
