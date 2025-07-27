const { exec } = require("child_process");

const tailwindConfigPath = "./tailwind.config.ts"; // Adjust if your config is in a different location
const outputCssPath = "./app/(public)/public.css"; // Tailwind input CSS file
const publicCssPath = "./public/chaistyles.css"; // Final output location

const generateTailwindCss = async (devMode = false) => {
  const chalk = (await import("chalk")).default;

  console.log("Generating Tailwind CSS...");

  const watchFlag = devMode ? "--watch" : "";
  const minifyFlag = devMode ? "" : "--minify";

  const command = `npx tailwindcss -c ${tailwindConfigPath} -i "${outputCssPath}" -o "${publicCssPath}" ${watchFlag} ${minifyFlag}`;

  console.log(`Running: ${command}`);

  const process = exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error(
        chalk.red("Error generating Tailwind CSS:"),
        chalk.red(stderr)
      );
      return;
    }

    if (!devMode) {
      console.log(stdout);
      console.log("Copying CSS to public folder...");
      console.log("CSS generation and copy complete!");
    }
  });

  if (devMode) {
    process.stdout.on("data", (data) => {
      console.log(data.toString());
    });

    process.stderr.on("data", (data) => {
      console.error(chalk.red(data.toString()));
    });

    console.log("Watching for CSS changes...");
  }
};

// Check if running in dev mode
const args = process.argv.slice(2);
const devMode = args.includes("--dev") || args.includes("-d");

generateTailwindCss(devMode);
