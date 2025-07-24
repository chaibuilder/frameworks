import {
  ChaiPageProps,
  loadWebBlocks,
  PreviewBanner,
  RenderChaiBlocks,
} from "chai-next";
import ChaiBuilder from "chai-next/server";
import { draftMode } from "next/headers";

ChaiBuilder.init(process.env.CHAIBUILDER_API_KEY!);
loadWebBlocks();

export const dynamic = "force-static"; // Remove this if you want to use ssr mode

export const generateMetadata = async (props: {
  params: Promise<{ slug: string[] }>;
}) => {
  const nextParams = await props.params;
  const slug = nextParams.slug ? `/${nextParams.slug.join("/")}` : "/";
  return await ChaiBuilder.getPageExternalData({ slug });
};

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const nextParams = await params;
  const slug = nextParams.slug ? `/${nextParams.slug.join("/")}` : "/";

  const { isEnabled } = await draftMode();
  ChaiBuilder.setDraftMode(isEnabled);

  const page = await ChaiBuilder.getPage(slug);

  //NOTE: pageProps are received in your dataProvider functions for block and page
  const pageProps: ChaiPageProps = {
    slug,
    pageType: page.pageType,
    fallbackLang: page.fallbackLang,
    pageLang: page.pageLang,
  };
  return (
    <>
      <PreviewBanner slug={slug} show={isEnabled} />
      <RenderChaiBlocks page={page} pageProps={pageProps} />
    </>
  );
}
