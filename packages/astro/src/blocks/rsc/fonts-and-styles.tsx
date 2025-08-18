import { getChaiThemeCssVariables } from "@chaibuilder/sdk/render";
import { get } from "lodash";
import ChaiBuilder from "../../server";
import {
  getFontHref,
  getThemeCustomFontFace,
} from "../../server/styles-helper";

export const FontsAndStyles = async () => {
  const siteSettings = await ChaiBuilder.getSiteSettings();

  if (!!get(siteSettings, "error")) {
    console.log("Site Settings Error: ", siteSettings);
  }

  // Add empty theme object as fallback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const theme = get(siteSettings, "theme", {}) as any;
  const themeCssVariables = getChaiThemeCssVariables(theme);
  const bodyFont = get(theme, "fontFamily.body", "Inter");
  const headingFont = get(theme, "fontFamily.heading", "Inter");
  const fontUrls = getFontHref([bodyFont, headingFont]);
  const customFontFace = getThemeCustomFontFace([bodyFont, headingFont]);

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {fontUrls.map((fontUrl: string) => (
        <link
          key={fontUrl}
          rel="preload"
          href={fontUrl}
          as="style"
          crossOrigin=""
        />
      ))}

      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />

      <style
        id="theme-variables"
        dangerouslySetInnerHTML={{ __html: themeCssVariables }}
      />
      {fontUrls.map((fontUrl: string) => (
        <link key={fontUrl} rel="stylesheet" href={fontUrl} />
      ))}
      {customFontFace && (
        <style
          id="custom-font-face"
          dangerouslySetInnerHTML={{ __html: customFontFace }}
        />
      )}
    </>
  );
};
