import { ChaiPageProps, loadWebBlocks } from "@chaibuilder/nextjs/blocks";
import { ChaiPageStyles, PreviewBanner, RenderChaiBlocks } from "@chaibuilder/nextjs/blocks/rsc";
import ChaiBuilder from "@chaibuilder/nextjs/server";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";

loadWebBlocks();

export const dynamic = "force-static";

export const generateMetadata = async (props: { params: Promise<{ slug: string[] }> }) => {
  const nextParams = await props.params;
  const slug = nextParams.slug ? `/${nextParams.slug.join("/")}` : "/";

  const { isEnabled } = await draftMode();
  ChaiBuilder.init(process.env.CHAIBUILDER_API_KEY!, isEnabled);
  return await ChaiBuilder.getPageSeoData(slug);
};

export default async function Page({ params }: { params: Promise<{ slug: string[] }> }) {
  const nextParams = await params;
  const slug = nextParams.slug ? `/${nextParams.slug.join("/")}` : "/";

  const { isEnabled } = await draftMode();
  ChaiBuilder.init(process.env.CHAIBUILDER_API_KEY!, isEnabled);
  let page = null;
  try {
    page = await ChaiBuilder.getPage(slug);
    if ("error" in page) {
      return notFound();
    }
  } catch (err) {
    return notFound();
  }

  //NOTE: pageProps are received in your dataProvider functions for block and page
  const pageProps: ChaiPageProps = {
    slug,
    pageType: page.pageType,
    fallbackLang: page.fallbackLang,
    pageLang: page.lang,
  };
  return (
    <>
      <head>
        <ChaiPageStyles page={page} />
      </head>
      <body className={`font-body antialiased`}>
        <PreviewBanner slug={slug} show={isEnabled} />
        <RenderChaiBlocks page={page} pageProps={pageProps} />
      </body>
    </>
  );
}
