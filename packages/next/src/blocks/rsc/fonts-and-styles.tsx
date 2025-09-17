import { getChaiThemeCssVariables } from "@chaibuilder/sdk/render";
import { get } from "lodash";
import ChaiBuilder from "../../server";
import { getFontHref, getThemeCustomFontFace } from "../../server/styles-helper";
import { ChaiBuilderPage } from "../../types";

export const FontsAndStyles = async (props: { page?: ChaiBuilderPage; googleFonts?: boolean }) => {
  const { page, googleFonts } = props;
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
  const styles = page ? await ChaiBuilder.getPageStyles(page.blocks) : null;
  return (
    <>
      {googleFonts ? <link rel="preconnect" href="https://fonts.googleapis.com" /> : null}
      {googleFonts ? <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" /> : null}
      {googleFonts
        ? fontUrls.map((fontUrl: string) => (
            <link key={fontUrl} rel="preload" href={fontUrl} as="style" crossOrigin="" />
          ))
        : null}
      {googleFonts
        ? fontUrls.map((fontUrl: string) => <link key={fontUrl} rel="stylesheet" href={fontUrl} crossOrigin="" />)
        : null}
      <style id="theme-variables" dangerouslySetInnerHTML={{ __html: themeCssVariables }} />
      {customFontFace && <style id="custom-font-face" dangerouslySetInnerHTML={{ __html: customFontFace }} />}
      {styles ? <style id="page-styles">{styles}</style> : null}
    </>
  );
};
