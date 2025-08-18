#!/usr/bin/env node
const { exec } = require("child_process");
const path = require("path");

/**
 * Configurable Tailwind CSS generator for Chai Builder projects
 * Can be used with custom paths or default paths
 */
const generateTailwindCss = async (options = {}) => {
  const chalk = (await import("chalk")).default;

  // Default configuration - can be overridden
  const config = {
    tailwindConfigPath: "./tailwind.config.ts",
    inputCssPath: "./app/(public)/public.css",
    outputCssPath: "./public/chaistyles.css",
    watchMode: false,
    ...options,
  };

  const mode = config.watchMode ? "watch" : "build";
  console.log(`Tailwind CSS ${mode} mode...`);

  const watchFlag = config.watchMode ? "--watch" : "";
  const minifyFlag = config.watchMode ? "" : "--minify";

  const command =
    `npx tailwindcss -c ${config.tailwindConfigPath} -i "${config.inputCssPath}" -o "${config.outputCssPath}" ${watchFlag} ${minifyFlag}`
      .trim()
      .replace(/\s+/g, " ");

  console.log(`Running: ${command}`);

  const process = exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error(
        chalk.red("Error generating Tailwind CSS:"),
        chalk.red(stderr)
      );
      return;
    }

    if (!config.watchMode) {
      console.log(stdout);
      console.log("CSS generation complete!");
    }
  });

  if (config.watchMode) {
    process.stdout.on("data", (data) => {
      console.log(data.toString());
    });

    process.stderr.on("data", (data) => {
      console.error(chalk.red(data.toString()));
    });

    console.log(
      chalk.green("Watching for CSS changes... Press Ctrl+C to stop.")
    );
  }
};

// When run directly from command line
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const watchMode = args.includes("--watch") || args.includes("-w");

  // Support legacy --dev flag for backward compatibility
  const legacyDevMode = args.includes("--dev") || args.includes("-d");

  if (legacyDevMode) {
    console.log("⚠️  --dev flag is deprecated. Use --watch instead.");
  }

  generateTailwindCss({ watchMode: watchMode || legacyDevMode });
}

// Export for programmatic use
module.exports = { generateTailwindCss };
