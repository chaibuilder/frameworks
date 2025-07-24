import { RenderChaiBlocks as RenderChaiBlocksSdk } from "@chaibuilder/sdk/render";
import { ChaiPageProps } from "@chaibuilder/sdk/runtime";
import ChaiBuilder from "../server";
import { ChaiBuilderPage } from "../types";

export const RenderChaiBlocks = async ({
  page,
  pageProps,
}: {
  page: ChaiBuilderPage;
  pageProps: ChaiPageProps;
}) => {
  const pageData = await ChaiBuilder.getPageExternalData(pageProps);
  return (
    <RenderChaiBlocksSdk
      externalData={pageData}
      blocks={page.blocks}
      fallbackLang={page.fallbackLang}
      lang={page.pageLang}
      pageProps={pageProps}
    />
  );
};
