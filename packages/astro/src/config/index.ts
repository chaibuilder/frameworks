import type { AstroIntegration } from "astro";

/**
 * ChaiBuilder Astro integration
 * Handles canvas binary files and other configurations needed for ChaiBuilder
 */
export function chaiBuilderIntegration(
  options: {
    // Add any configuration options here
    enableCanvas?: boolean;
  } = {},
): AstroIntegration {
  return {
    name: "chai-builder",
    hooks: {
      "astro:config:setup": ({ updateConfig, config }) => {
        // Configure Vite for ChaiBuilder requirements
        updateConfig({
          vite: {
            ...config.vite,
            optimizeDeps: {
              ...config.vite?.optimizeDeps,
              exclude: [
                ...(config.vite?.optimizeDeps?.exclude || []),
                // Exclude canvas from optimization if needed
                ...(options.enableCanvas === false ? ["canvas"] : []),
              ],
            },
            define: {
              ...config.vite?.define,
              // Handle canvas module for image editor
              "process.env.CANVAS": options.enableCanvas !== false ? "true" : "false",
            },
            resolve: {
              ...config.vite?.resolve,
              alias: [
                ...(Array.isArray(config.vite?.resolve?.alias) ? config.vite.resolve.alias : []),
                // Handle canvas fallback for browser
                ...(options.enableCanvas === false ? [{ find: "canvas", replacement: "false" }] : []),
              ],
            },
          },
        });
      },
    },
  };
}

export default chaiBuilderIntegration;
