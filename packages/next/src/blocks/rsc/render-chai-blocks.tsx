import { DesignTokens } from "@chaibuilder/pages/server";
import { applyDesignTokens, RenderChaiBlocks as RenderChaiBlocksSdk } from "@chaibuilder/sdk/render";
import { ChaiBlockComponentProps, ChaiPageProps, ChaiStyles, setChaiBlockComponent } from "@chaibuilder/sdk/runtime";
import { isEmpty } from "lodash";
import ChaiBuilder from "../../server";
import { ChaiBuilderPage } from "../../types";
import { ImageBlock } from "./image-block";
import { JSONLD } from "./json-ld";
import { LinkBlock } from "./link-block";

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
  designTokens = {},
}: {
  page: ChaiBuilderPage;
  pageProps: ChaiPageProps;
  designTokens?: DesignTokens;
  linkComponent?:
    | React.ComponentType<ChaiBlockComponentProps<LinkBlockProps>>
    | Promise<React.ComponentType<ChaiBlockComponentProps<LinkBlockProps>>>;
  imageComponent?:
    | React.ComponentType<ChaiBlockComponentProps<ImageBlockProps>>
    | Promise<React.ComponentType<ChaiBlockComponentProps<ImageBlockProps>>>;
}) => {
  //@ts-ignore
  setChaiBlockComponent("Link", await linkComponent);
  //@ts-ignore
  setChaiBlockComponent("Image", await imageComponent);
  const pageData = await ChaiBuilder.getPageExternalData({
    blocks: page.blocks,
    pageProps,
    pageType: page.pageType,
    lang: page.lang,
  });
  //Register Link and Image blocks with Chai Builder
  return (
    <>
      <JSONLD jsonLD={page?.seo?.jsonLD} pageData={pageData} />
      <RenderChaiBlocksSdk
        externalData={pageData}
        blocks={!isEmpty(designTokens) ? applyDesignTokens(page.blocks, designTokens) : page.blocks}
        fallbackLang={page.fallbackLang}
        lang={page.lang}
        pageProps={pageProps}
      />
    </>
  );
};
