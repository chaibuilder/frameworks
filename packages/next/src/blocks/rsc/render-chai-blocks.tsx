import { RenderChaiBlocks as RenderChaiBlocksSdk } from "@chaibuilder/sdk/render";
import { ChaiBlockComponentProps, ChaiPageProps, ChaiStyles, setChaiBlockComponent } from "@chaibuilder/sdk/runtime";
import ChaiBuilder from "../../server";
import { ChaiBuilderPage } from "../../types";
import { ImageBlock } from "./Image";
import { JSONLD } from "./json-ld";
import { LinkBlock } from "./Link";

type ImageBlockProps = {
  height: string;
  width: string;
  alt: string;
  styles: ChaiStyles;
  lazyLoading: boolean;
  image: string;
};

type LinkBlockProps = {
  styles: ChaiStyles;
  content: string;
  link: {
    type: "page" | "pageType" | "url" | "email" | "telephone" | "element";
    target: "_self" | "_blank";
    href: string;
  };
  prefetchLink?: boolean;
};

export const RenderChaiBlocks = async ({
  page,
  pageProps,
  linkComponent = LinkBlock,
  imageComponent = ImageBlock,
}: {
  page: ChaiBuilderPage;
  pageProps: ChaiPageProps;
  linkComponent?:
    | React.ComponentType<ChaiBlockComponentProps<LinkBlockProps>>
    | Promise<React.ComponentType<ChaiBlockComponentProps<LinkBlockProps>>>;
  imageComponent?:
    | React.ComponentType<ChaiBlockComponentProps<ImageBlockProps>>
    | Promise<React.ComponentType<ChaiBlockComponentProps<ImageBlockProps>>>;
}) => {
  setChaiBlockComponent("Link", await linkComponent);
  setChaiBlockComponent("Image", await imageComponent);
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
