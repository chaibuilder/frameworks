import { ChaiBlock } from "@chaibuilder/pages/runtime";
import {
  ChaiBuilderPages,
  ChaiBuilderPagesBackend,
  ChaiPageProps,
} from "@chaibuilder/pages/server";
import { unstable_cache } from "next/cache";
import { getPageStyles } from "./get-page-styles";

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
    ChaiBuilder.pages = new ChaiBuilderPages(
      new ChaiBuilderPagesBackend(apiKey)
    );
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
    return unstable_cache(
      async () => await ChaiBuilder.pages?.getSiteSettings(),
      ["website-settings"],
      { tags: ["website-settings"] }
    )();
  }

  static async getPage(slug: string) {
    ChaiBuilder.verifyInit();
    const page: ChaiBuilderPage = await ChaiBuilder.pages?.getPageBySlug(slug);
    if ("error" in page) {
      return page;
    }

    const siteSettings = await ChaiBuilder.getSiteSettings();
    const tagPageId = page.id;
    return unstable_cache(
      async () => {
        const data = await ChaiBuilder.pages?.getFullPage(page.languagePageId);
        const fallbackLang = siteSettings?.fallbackLang;
        return { ...data, fallbackLang, lang: page.lang || fallbackLang };
      },
      ["page-" + page.languagePageId, page.lang, page.id, slug],
      { tags: ["page-" + tagPageId] }
    )();
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
}

export { ChaiBuilder };
