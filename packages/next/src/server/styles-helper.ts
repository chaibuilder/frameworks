import {
  ChaiFont,
  ChaiFontViaSrc,
  getRegisteredFont,
} from "@chaibuilder/pages/runtime";
import fs from "fs/promises";
import { compact, filter, has, map, uniqBy } from "lodash";
import path from "path";
import postcss from "postcss";

async function findTailwindCssFile(): Promise<string> {
  // Use absolute path for production to work on Vercel
  return path.resolve("./public/chaistyles.css");
}

export async function filterDuplicateStyles(
  newStyles: string
): Promise<string> {
  try {
    const tailwindCssPath = await findTailwindCssFile();
    const tailwindCss = await fs.readFile(tailwindCssPath, "utf-8");

    const tailwindRoot = postcss.parse(tailwindCss);
    const newStylesRoot = postcss.parse(newStyles);

    const tailwindSelectors = new Set<string>();
    tailwindRoot.walkRules((rule: { selector: string }) => {
      tailwindSelectors.add(rule.selector);
    });

    newStylesRoot.walkRules(
      (rule: { selector: string; parent: any; remove: () => void }) => {
        // Check if the rule has a parent and if it's a media query (breakpoint)
        const hasBreakpoint =
          rule.parent?.type === "atrule" &&
          "name" in rule.parent &&
          rule.parent.name === "media";

        // Only remove the rule if it's in tailwindSelectors and doesn't have a breakpoint
        if (tailwindSelectors.has(rule.selector) && !hasBreakpoint) {
          rule.remove();
        }
      }
    );

    return newStylesRoot.toString();
  } catch (error) {
    console.error("Error filtering styles:", error);
    return newStyles;
  }
}

export const getChaiCommonStyles = async () => {
  const tailwindCssPath = await findTailwindCssFile();
  const tailwindCss = await fs.readFile(tailwindCssPath, "utf-8");
  return tailwindCss;
};

/** TODO: Move to @chaibuilder/pages/render */
export const getThemeCustomFontFace = (fonts: string[]) => {
  const fontdefintions = filter(
    compact(map(fonts, getRegisteredFont)),
    (font: ChaiFont) => has(font, "src")
  );
  return getThemeCustomFontFaceStyle(fontdefintions as ChaiFontViaSrc[]);
};

export const getThemeCustomFontFaceStyle = (fonts: ChaiFontViaSrc[]) => {
  if (!fonts || fonts.length === 0) return "";

  return uniqBy(fonts, "family")
    .map((font: ChaiFontViaSrc) =>
      font.src
        .map(
          (source) => `@font-face {
        font-family: "${font.family}";
        src: url("${source.url}") format("${source.format}");
        font-display: swap;
        ${source.fontWeight ? `font-weight: ${source.fontWeight};` : ""}
        ${source.fontStyle ? `font-style: ${source.fontStyle};` : ""}
        ${source.fontStretch ? `font-stretch: ${source.fontStretch};` : ""}
      }`
        )
        .join("\n")
    )
    .join("\n");
};

export const getFontHref = (fonts: string[]): string[] => {
  const fontdefintions = filter(
    uniqBy(compact(map(fonts, getRegisteredFont)), "family"),
    (font: ChaiFont) => has(font, "url")
  );
  if (fontdefintions.length === 0) return [];
  return map(fontdefintions, "url") as string[];
};
