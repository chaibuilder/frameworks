import { ChaiBlock } from "@chaibuilder/pages/runtime";
import { ChaiBuilderPages, ChaiPageProps } from "@chaibuilder/pages/server";
import { has } from "lodash";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { cache } from "react";
import { withDataBinding } from "../utils/with-data-binding";
import { getPageStyles } from "./get-page-styles";
import { ChaiBuilderSupabaseBackend } from "./PagesSupabaseBackend";
import { getSupabaseAdmin } from "./supabase";

type ChaiBuilderPage =
  | {
      id: string;
      slug: string;
      lang: string;
      name: string;
      pageType: string;
      languagePageId: string;
      blocks: ChaiBlock[];
    }
  | { error: string };

class ChaiBuilder {
  private static pages?: ChaiBuilderPages;
  private static hostname: string = "default";
  private static siteId?: string;

  static verifyInit() {
    if (!ChaiBuilder.pages) {
      throw new Error("ChaiBuilder not initialized. Please call init() first.");
    }
  }

  static init = async (apiKey: string, draftMode: boolean = false) => {
    if (!apiKey) {
      throw new Error("Please initialize ChaiBuilder with an API key");
    }
    ChaiBuilder.siteId = apiKey;
    ChaiBuilder.pages = new ChaiBuilderPages({ backend: new ChaiBuilderSupabaseBackend(apiKey) });
    await ChaiBuilder.loadSiteSettings(draftMode);
  };

  static initByHostname = async (hostname: string, draftMode: boolean = false) => {
    if (!hostname) {
      console.error("Please initialize ChaiBuilder with a hostname");
      return notFound();
    }
    ChaiBuilder.hostname = hostname;
    const siteResult = await ChaiBuilder.getSiteIdByHostname(hostname);
    if (has(siteResult, "error")) {
      console.error(`Error fetching site ID for hostname ${hostname}: ${siteResult.error}`);
      return notFound();
    }
    ChaiBuilder.siteId = siteResult.id as string;
    ChaiBuilder.pages = new ChaiBuilderPages({ backend: new ChaiBuilderSupabaseBackend(siteResult.id as string) });
    await ChaiBuilder.loadSiteSettings(draftMode);
  };

  static getSiteId() {
    return ChaiBuilder.siteId;
  }

  static setSiteId(siteId: string) {
    ChaiBuilder.siteId = siteId;
  }

  static getSiteIdByHostname = cache(async (hostname: string) => {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
      .from("app_domains")
      .select("app")
      .or(`domain.eq.${hostname.replace("www.", "")},subdomain.eq.${hostname}`)
      .maybeSingle();
    if (!data) {
      return { error: "No app found for hostname" };
    }
    return { id: data.app };
  });

  static async loadSiteSettings(draftMode: boolean) {
    ChaiBuilder.verifyInit();
    const siteSettings = await ChaiBuilder.getSiteSettings();
    console.log("Site Settings", siteSettings);

    ChaiBuilder.pages?.setFallbackLang(siteSettings?.fallbackLang);
    ChaiBuilder.pages?.setDraftMode(draftMode);
  }

  static setDraftMode(draftMode: boolean) {
    ChaiBuilder.verifyInit();
    ChaiBuilder.pages?.setDraftMode(draftMode);
  }

  static setFallbackLang(lang: string) {
    ChaiBuilder.verifyInit();
    ChaiBuilder.pages?.setFallbackLang(lang);
  }

  static getFallbackLang() {
    ChaiBuilder.verifyInit();
    return ChaiBuilder.pages?.getFallbackLang();
  }

  static async getSiteSettings() {
    ChaiBuilder.verifyInit();
    return await unstable_cache(
      async () => await ChaiBuilder.pages?.getSiteSettings(),
      [`website-settings-${ChaiBuilder.getSiteId()}`],
      { tags: [`website-settings`, `website-settings-${ChaiBuilder.getSiteId()}`] },
    )();
  }

  static async getPartialPageBySlug(slug: string) {
    ChaiBuilder.verifyInit();
    // if the slug is of format /_partial/{langcode}/{uuid}, get the uuid. langcode is optional
    const uuid = slug.split("/").pop();
    if (!uuid) {
      throw new Error("Invalid slug format for partial page");
    }

    // Fetch the partial page data
    const siteSettings = await ChaiBuilder.getSiteSettings();
    const data = await ChaiBuilder.pages?.getFullPage(uuid);
    const fallbackLang = siteSettings?.fallbackLang;
    const lang = slug.split("/").length > 3 ? slug.split("/")[2] : fallbackLang;
    return { ...data, fallbackLang, lang };
  }

  static getPage = cache(async (slug: string) => {
    ChaiBuilder.verifyInit();
    if (slug.startsWith("/_partial/")) {
      return await ChaiBuilder.getPartialPageBySlug(slug);
    }
    const page: ChaiBuilderPage = await ChaiBuilder.pages?.getPageBySlug(slug);
    if ("error" in page) {
      return page;
    }

    const siteSettings = await ChaiBuilder.getSiteSettings();
    const tagPageId = page.id;
    return await unstable_cache(
      async () => {
        const data = await ChaiBuilder.pages?.getFullPage(page.languagePageId);
        const fallbackLang = siteSettings?.fallbackLang;
        return { ...data, fallbackLang, lang: page.lang || fallbackLang };
      },
      ["page-" + page.languagePageId, page.lang, page.id, slug],
      { tags: ["page-" + tagPageId] },
    )();
  });

  static async getPageSeoData(slug: string) {
    ChaiBuilder.verifyInit();
    if (slug.startsWith("/_partial/")) {
      return {
        title: "Partial Page",
        description: "This is a partial page.",
        robots: {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        },
      };
    }
    const page = await ChaiBuilder.getPage(slug);
    if ("error" in page) {
      return {
        title: "Page Not Found",
        description: "The requested page could not be found.",
        robots: { index: false, follow: false },
      };
    }

    const externalData = await ChaiBuilder.getPageExternalData({
      blocks: page.blocks,
      pageProps: page,
      pageType: page.pageType,
      lang: page.lang,
    });

    const seo = withDataBinding(page?.seo ?? {}, externalData);

    return {
      title: seo?.title,
      description: seo?.description,
      openGraph: {
        title: seo?.ogTitle || seo?.title,
        description: seo?.ogDescription || seo?.description,
        images: seo?.ogImage ? [seo?.ogImage] : [],
      },
      alternates: {
        canonical: seo?.canonicalUrl || "",
      },
      robots: {
        index: !seo?.noIndex,
        follow: !seo?.noFollow,
        googleBot: {
          index: !seo?.noIndex,
          follow: !seo?.noFollow,
        },
      },
    };
  }

  static async getPageExternalData(args: {
    blocks: ChaiBlock[];
    pageProps: ChaiPageProps;
    pageType: string;
    lang: string;
  }) {
    ChaiBuilder.verifyInit();
    return await ChaiBuilder.pages?.getPageData(args);
  }

  static async getPageStyles(blocks: ChaiBlock[]) {
    ChaiBuilder.verifyInit();
    return await getPageStyles(blocks);
  }

  static resolvePageLink = cache(async (href: string, lang: string) => {
    ChaiBuilder.verifyInit();
    return await ChaiBuilder.pages?.resolvePageLink(href, lang);
  });
}

export { ChaiBuilder };
