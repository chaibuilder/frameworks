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
  const [pageData, styles] = await Promise.all([
    ChaiBuilder.getPageExternalData({
      blocks: page.blocks,
      pageProps,
      pageType: page.pageType,
      lang: page.lang,
    }),
    ChaiBuilder.getPageStyles(page.blocks),
  ]);
  return (
    <>
      <style id="page-styles">{styles}</style>
      <script type="application/jsonld">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@graph": "[]",
        })}
      </script>
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
