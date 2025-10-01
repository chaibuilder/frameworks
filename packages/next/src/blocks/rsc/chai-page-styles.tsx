import { getChaiThemeCssVariables } from "@chaibuilder/sdk/render";
import { get } from "lodash";
import ChaiBuilder from "../../server";
import { ChaiBuilderPage } from "../../types";

export const ChaiPageStyles = async (props: { page?: ChaiBuilderPage }) => {
  const { page } = props;
  const siteSettings = await ChaiBuilder.getSiteSettings();

  if (!!get(siteSettings, "error")) {
    console.log("Site Settings Error: ", siteSettings);
  }

  const theme = get(siteSettings, "theme", {});
  const themeCssVariables = getChaiThemeCssVariables(theme);
  const styles = page ? await ChaiBuilder.getPageStyles(page.blocks) : null;
  return (
    <>
      <style id="theme-variables" dangerouslySetInnerHTML={{ __html: themeCssVariables }} />
      {styles ? <style id="page-styles">{styles}</style> : null}
    </>
  );
};
