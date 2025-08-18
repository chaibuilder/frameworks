import { ChaiBlock } from "@chaibuilder/pages/runtime";
import { ChaiBuilderPages, ChaiBuilderPagesBackend, ChaiPageProps } from "@chaibuilder/pages/server";
import { withDataBinding } from "../utils/with-data-binding";
import { getPageStyles } from "./get-page-styles";

// Simple in-memory cache for Astro (you might want to use a more sophisticated caching solution)
const cache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function createCacheKey(parts: (string | number)[]): string {
  return parts.join(":");
}

function getCachedValue<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }
  cache.delete(key);
  return null;
}

function setCachedValue<T>(key: string, value: T): T {
  cache.set(key, { value, timestamp: Date.now() });
  return value;
}

async function withCache<T>(fn: () => Promise<T>, key: string): Promise<T> {
  const cached = getCachedValue<T>(key);
  if (cached !== null) {
    return cached;
  }

  const result = await fn();
  return setCachedValue(key, result);
}

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

  static verifyInit() {
    if (!ChaiBuilder.pages) {
      throw new Error("ChaiBuilder not initialized. Please call init() first.");
    }
  }

  static init(apiKey: string) {
    if (!apiKey) {
      throw new Error("Please initialize ChaiBuilder with an API key");
    }
    ChaiBuilder.pages = new ChaiBuilderPages(new ChaiBuilderPagesBackend(apiKey));
  }

  static async loadSiteSettings(draftMode: boolean) {
    ChaiBuilder.verifyInit();
    const siteSettings = await ChaiBuilder.getSiteSettings();
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
    return await withCache(async () => await ChaiBuilder.pages?.getSiteSettings(), "website-settings");
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

  static async getPage(slug: string) {
    ChaiBuilder.verifyInit();
    if (slug.startsWith("/_partial/")) {
      return await ChaiBuilder.getPartialPageBySlug(slug);
    }
    const page: ChaiBuilderPage = await ChaiBuilder.pages?.getPageBySlug(slug);
    if ("error" in page) {
      return page;
    }

    const siteSettings = await ChaiBuilder.getSiteSettings();
    const cacheKey = createCacheKey(["page", page.languagePageId, page.lang, page.id, slug]);
    return await withCache(async () => {
      const data = await ChaiBuilder.pages?.getFullPage(page.languagePageId);
      const fallbackLang = siteSettings?.fallbackLang;
      return { ...data, fallbackLang, lang: page.lang || fallbackLang };
    }, cacheKey);
  }

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

  static async resolvePageLink(href: string, lang: string) {
    ChaiBuilder.verifyInit();
    const cacheKey = createCacheKey(["page-link", href, lang]);
    return await withCache(async () => await ChaiBuilder.pages?.resolvePageLink(href, lang), cacheKey);
  }
}

export { ChaiBuilder };
