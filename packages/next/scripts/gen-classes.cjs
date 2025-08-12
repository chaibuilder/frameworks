#!/usr/bin/env node
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const postcss = require("postcss");
const selectorParser = require("postcss-selector-parser");

/**
 * Generates CSS for ChaiBuilder packages only and extracts unique class names
 * This script is designed to run at the end of the build process
 */
const generateChaiBuilderClasses = async (options = {}) => {
  const chalk = (await import("chalk")).default;

  // Configuration
  const config = {
    outputCssPath: "./temp-chai-classes.css", // Temporary file, will be deleted
    classesOutputPath: "./src/classes.ts",
    tempConfigPath: "./temp-chai.tailwind.config.js",
    ...options,
  };

  console.log(chalk.blue("🎨 Generating ChaiBuilder CSS classes..."));

  try {
    // Step 1: Create temporary Tailwind config with only ChaiBuilder content paths
    const tempTailwindConfig = `
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./node_modules/@chaibuilder/sdk/dist/**/*.{js,cjs}",
    "./node_modules/@chaibuilder/pages/dist/**/*.{js,cjs}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // Disable CSS reset/normalize
  corePlugins: {
    preflight: false,
  },
}
`;

    // Write temporary config
    fs.writeFileSync(config.tempConfigPath, tempTailwindConfig);
    console.log(chalk.green("✓ Created temporary Tailwind config"));

    // Step 2: Create minimal input CSS (no reset/normalize)
    const inputCss = `
/* ChaiBuilder classes only - no reset/normalize */
@tailwind utilities;
@tailwind components;
`;

    const tempInputPath = "./temp-input.css";
    fs.writeFileSync(tempInputPath, inputCss);
    console.log(chalk.green("✓ Created minimal input CSS"));

    // Step 3: Generate CSS using Tailwind
    const tailwindCommand = `npx tailwindcss -c ${config.tempConfigPath} -i ${tempInputPath} -o ${config.outputCssPath} --minify`;

    console.log(chalk.yellow(`Running: ${tailwindCommand}`));

    await new Promise((resolve, reject) => {
      exec(tailwindCommand, (err, stdout, stderr) => {
        if (err) {
          console.error(chalk.red("Error generating CSS:"), chalk.red(stderr));
          reject(err);
          return;
        }
        console.log(chalk.green("✓ CSS generated successfully"));
        resolve();
      });
    });

    // Step 4: Extract class names from generated CSS
    console.log(chalk.yellow("📝 Extracting class names..."));

    const cssContent = fs.readFileSync(config.outputCssPath, "utf8");
    console.log(chalk.blue(`CSS file size: ${cssContent.length} characters`));

    // Log first 500 characters for debugging
    console.log(chalk.gray("CSS preview:"), cssContent.substring(0, 500) + "...");

    const classNames = extractClassNamesFromCSS(cssContent);

    // Step 5: Write unique class names to TypeScript file (string array)
    const uniqueClasses = [...new Set(classNames)].sort();
    const arrayLiteral = JSON.stringify(uniqueClasses, null, 2);
    const tsContent = `export const classes: string[] = ${arrayLiteral};\n`;

    fs.writeFileSync(config.classesOutputPath, tsContent);
    console.log(chalk.green(`✓ Extracted ${uniqueClasses.length} unique class names to ${config.classesOutputPath}`));

    // Step 6: Cleanup temporary files (including the CSS file we don't need)
    if (fs.existsSync(config.tempConfigPath)) {
      fs.unlinkSync(config.tempConfigPath);
    }
    if (fs.existsSync(tempInputPath)) {
      fs.unlinkSync(tempInputPath);
    }
    if (fs.existsSync(config.outputCssPath)) {
      fs.unlinkSync(config.outputCssPath);
    }
    console.log(chalk.green("✓ Cleaned up temporary files"));

    console.log(chalk.green.bold("🎉 ChaiBuilder classes generation complete!"));
    console.log(chalk.cyan(`Classes file: ${config.classesOutputPath}`));
  } catch (error) {
    const chalk = (await import("chalk")).default;
    console.error(chalk.red("❌ Error during class generation:"), error);

    // Cleanup on error
    if (fs.existsSync(config.tempConfigPath)) {
      fs.unlinkSync(config.tempConfigPath);
    }
    if (fs.existsSync("./temp-input.css")) {
      fs.unlinkSync("./temp-input.css");
    }
    if (fs.existsSync(config.outputCssPath)) {
      fs.unlinkSync(config.outputCssPath);
    }

    process.exit(1);
  }
};

/**
 * Extract class names from CSS content using PostCSS + selector parser
 * This captures escaped Tailwind selectors and arbitrary value classes like bg-[...] or via-[...]
 */
function extractClassNamesFromCSS(cssContent) {
  const root = postcss.parse(cssContent);
  const set = new Set();

  root.walkRules((rule) => {
    const selector = rule.selector;
    if (!selector) return;

    try {
      selectorParser((selectors) => {
        selectors.walkClasses((classNode) => {
          // classNode.value is already unescaped (e.g., "bg-[size:10px_10px]")
          let v = classNode.value || "";
          v = v.trim();
          if (!v) return;

          // Filter obvious noise
          // Skip pure numbers or stray backslashes
          if (/^\\+$/.test(v) || /^[0-9]+(?:\.[0-9]+)?%?$/.test(v)) return;

          set.add(v);
        });
      }).processSync(selector);
    } catch (_) {
      // Ignore parse errors from unusual selectors
    }
  });

  return Array.from(set);
}

// When run directly from command line
if (require.main === module) {
  // Parse command line arguments for custom paths
  const args = process.argv.slice(2);
  const options = {};

  // Support custom output paths
  const outputIndex = args.indexOf("--output");
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    options.outputCssPath = args[outputIndex + 1];
  }

  const classesIndex = args.indexOf("--classes-output");
  if (classesIndex !== -1 && args[classesIndex + 1]) {
    options.classesOutputPath = args[classesIndex + 1];
  }

  generateChaiBuilderClasses(options);
}

// Export for programmatic use
module.exports = { generateChaiBuilderClasses };
