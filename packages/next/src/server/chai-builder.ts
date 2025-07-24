import {
  ChaiBuilderPages,
  ChaiBuilderPagesBackend,
  ChaiPageProps,
} from "@chaibuilder/pages/server";

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

  static setDraftMode(draftMode: boolean) {
    ChaiBuilder.verifyInit();
    ChaiBuilder.pages?.setDraftMode(draftMode);
  }

  static async getPage(slug: string) {
    ChaiBuilder.verifyInit();
    return await ChaiBuilder.pages?.getPageBySlug(slug);
  }

  static async getPageExternalData<T extends ChaiPageProps>(pageProps: T) {
    ChaiBuilder.verifyInit();
    return await ChaiBuilder.pages?.getPageData(pageProps as any);
  }
}

export { ChaiBuilder };
