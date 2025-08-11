import { RenderChaiBlocks as RenderChaiBlocksSdk } from "@chaibuilder/sdk/render";
import { ChaiBlockComponentProps, ChaiPageProps } from "@chaibuilder/sdk/runtime";
import ChaiBuilder from "../../server";
import { ChaiBuilderPage } from "../../types";
import { JSONLD } from "./json-ld";

export const RenderChaiBlocks = async ({
  page,
  pageProps,
}: {
  page: ChaiBuilderPage;
  pageProps: ChaiPageProps;
  linkComponent?: Promise<React.ComponentType<ChaiBlockComponentProps<any>>>;
  imageComponent?: Promise<React.ComponentType<ChaiBlockComponentProps<any>>>;
}) => {
  const [pageData, styles] = await Promise.all([
    ChaiBuilder.getPageExternalData({
      blocks: page.blocks,
      pageProps,
      pageType: page.pageType,
      lang: page.lang,
    }),
    ChaiBuilder.getPageStyles(page.blocks),
  ]);
  //Register Link and Image blocks with Chai Builder
  return (
    <>
      <style id="page-styles">{styles}</style>
      <JSONLD jsonLD={page?.seo?.jsonLD} pageData={pageData} />
      <RenderChaiBlocksSdk
        externalData={pageData}
        blocks={page.blocks}
        fallbackLang={page.fallbackLang}
        lang={page.lang}
        pageProps={pageProps}
      />
    </>
  );
};
