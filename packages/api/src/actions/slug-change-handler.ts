import { supabase } from "@/app/supabase";
import { ActionError } from "./action-error";

/**
 * Data for a page that needs slug update
 */
interface PageSlugUpdateData {
  id: string;
  slug: string;
  parent?: string | null;
  lang: string;
  primaryPage?: string | null;
  dynamic?: boolean;
}

/**
 * Handler for managing slug changes and their cascading effects
 */
export class SlugChangeHandler {
  private appId: string;
  private pageDataCache: Map<string, PageSlugUpdateData> = new Map();

  constructor(appId: string) {
    this.appId = appId;
  }

  /**
   * Detect if there's a slug change by comparing current and new slug
   */
  async hasSlugChanged(pageId: string, newSlug?: string): Promise<boolean> {
    if (!newSlug) {
      return false;
    }

    const currentPage = await this.getCurrentPageData(pageId);
    return currentPage.slug !== newSlug;
  }

  /**
   * Handle the complete slug change process for a page and its children
   */
  async handleSlugChange(pageId: string, newSlug: string): Promise<void> {
    try {
      // Get the current page data
      const currentPage = await this.getCurrentPageData(pageId);

      // Handle slug change for the main page
      await this.processPageSlugChange(pageId, newSlug);

      // Handle slug changes for all child pages recursively
      await this.processChildrenSlugChanges(pageId, currentPage.slug, newSlug);
    } catch (error) {
      throw new ActionError(
        `Failed to handle slug change: ${error instanceof Error ? error.message : "Unknown error"}`,
        "SLUG_CHANGE_FAILED"
      );
    }
  }

  /**
   * Get current page data from database with memoization
   */
  private async getCurrentPageData(
    pageId: string
  ): Promise<PageSlugUpdateData> {
    // Check cache first
    if (this.pageDataCache.has(pageId)) {
      return this.pageDataCache.get(pageId)!;
    }

    const { data: pageData, error } = await supabase
      .from("app_pages")
      .select("id,slug,parent,lang,primaryPage,dynamic")
      .eq("id", pageId)
      .eq("app", this.appId)
      .single();

    if (error || !pageData) {
      throw new ActionError("Page not found", "PAGE_NOT_FOUND");
    }

    // Cache the result
    this.pageDataCache.set(pageId, pageData);
    return pageData;
  }

  /**
   * Clear the page data cache
   */
  private clearCache(): void {
    this.pageDataCache.clear();
  }

  /**
   * Invalidate cache entry for a specific page
   */
  private invalidateCacheEntry(pageId: string): void {
    this.pageDataCache.delete(pageId);
  }

  /**
   * Process slug change for a single page
   */
  private async processPageSlugChange(
    pageId: string,
    newSlug: string
  ): Promise<void> {
    // Update slug in app_pages_online table if record exists
    await this.updateSlugInOnlineTable(pageId, newSlug);

    // Update the slug in app_pages table is handled by the main UpdatePageAction
    // This method focuses on the online table slug update
  }

  /**
   * Update page slug in app_pages_online table if record exists
   */
  private async updateSlugInOnlineTable(
    pageId: string,
    newSlug: string
  ): Promise<void> {
    const { error } = await supabase
      .from("app_pages_online")
      .update({ slug: newSlug })
      .eq("id", pageId)
      .eq("app", this.appId);

    // It's okay if the page doesn't exist in online table or if update fails
    // We silently continue as this is not critical to the main slug change process
    if (error && !error.message.includes("No rows found")) {
      console.warn(
        `Failed to update page slug in online table for page ${pageId}:`,
        error.message
      );
    }
  }

  /**
   * Process slug changes for all child pages recursively
   */
  private async processChildrenSlugChanges(
    parentPageId: string,
    oldParentSlug: string,
    newParentSlug: string
  ): Promise<void> {
    // Get parent page data to access its language and primary page info
    const parentPage = await this.getCurrentPageData(parentPageId);

    let childPages: PageSlugUpdateData[] = [];

    if (parentPage.lang === "") {
      // This is a primary page - get direct children
      childPages = await this.getChildPages(parentPageId, parentPage.lang);
    } else {
      // This is a language page - find corresponding children in the same language
      if (parentPage.primaryPage) {
        // Get children of the primary page
        const primaryChildren = await this.getChildPages(
          parentPage.primaryPage,
          ""
        );

        // For each primary child, find its language variant in the same language as parent
        for (const primaryChild of primaryChildren) {
          const languageChild = await this.getLanguageVariantOfPage(
            primaryChild.id,
            parentPage.lang
          );
          if (languageChild) {
            childPages.push(languageChild);
          }
        }
      }
    }

    // Process all found child pages
    for (const childPage of childPages) {
      const newChildSlug = this.generateNewChildSlug(
        childPage.slug,
        oldParentSlug,
        newParentSlug
      );

      // Update child page slug
      await this.updateChildPageSlug(childPage.id, newChildSlug);

      // Update child slug in online table
      await this.updateSlugInOnlineTable(childPage.id, newChildSlug);

      // Recursively handle grandchildren
      await this.processChildrenSlugChanges(
        childPage.id,
        childPage.slug,
        newChildSlug
      );
    }
  }

  /**
   * Get all direct child pages of a parent page with the same language
   */
  private async getChildPages(
    parentPageId: string,
    parentLang: string
  ): Promise<PageSlugUpdateData[]> {
    const { data: childPages, error } = await supabase
      .from("app_pages")
      .select("id, slug, parent, lang, primaryPage")
      .eq("parent", parentPageId)
      .eq("lang", parentLang)
      .eq("app", this.appId);

    if (error) {
      console.warn(
        `Failed to fetch child pages for parent ${parentPageId}:`,
        error.message
      );
      return [];
    }

    return childPages || [];
  }

  /**
   * Get language variant of a specific page in a specific language
   */
  private async getLanguageVariantOfPage(
    primaryPageId: string,
    targetLang: string
  ): Promise<PageSlugUpdateData | null> {
    const { data: languagePage, error } = await supabase
      .from("app_pages")
      .select("id, slug, parent, lang, primaryPage")
      .eq("primaryPage", primaryPageId)
      .eq("lang", targetLang)
      .eq("app", this.appId)
      .single();

    if (error) {
      // It's okay if no language variant exists
      if (error.code === "PGRST116") {
        return null;
      }
      console.warn(
        `Failed to fetch language variant for page ${primaryPageId}:`,
        error.message
      );
      return null;
    }

    return languagePage;
  }

  /**
   * Generate new slug for child page based on parent slug change
   */
  private generateNewChildSlug(
    currentChildSlug: string,
    oldParentSlug: string,
    newParentSlug: string
  ): string {
    //dynamic page
    if (currentChildSlug === oldParentSlug) {
      return newParentSlug;
    }

    // If child slug starts with old parent slug, replace it with new parent slug
    if (currentChildSlug.startsWith(oldParentSlug + "/")) {
      return currentChildSlug.replace(oldParentSlug + "/", newParentSlug + "/");
    }

    // If child slug starts with old parent slug (without trailing slash)
    if (
      currentChildSlug.startsWith(oldParentSlug) &&
      currentChildSlug !== oldParentSlug
    ) {
      return currentChildSlug.replace(oldParentSlug, newParentSlug);
    }

    // For other cases, construct new slug by replacing the parent part
    return `${newParentSlug}/${currentChildSlug.split("/").pop()}`;
  }

  /**
   * Update child page slug in the database
   */
  private async updateChildPageSlug(
    pageId: string,
    newSlug: string
  ): Promise<void> {
    const { error } = await supabase
      .from("app_pages")
      .update({
        slug: newSlug,
        lastSaved: "now()",
      })
      .eq("id", pageId)
      .eq("app", this.appId);

    if (error) {
      throw new ActionError(
        `Failed to update child page slug: ${pageId}`,
        "UPDATE_CHILD_SLUG_FAILED"
      );
    }

    // Invalidate cache for this page since its data has changed
    this.invalidateCacheEntry(pageId);
  }

  /**
   * Validate that the new slug doesn't conflict with existing pages
   */
  async validateSlugAvailability(
    newSlug: string,
    excludePageId?: string
  ): Promise<void> {
    const page = await this.getCurrentPageData(excludePageId || "");
    const { data, error } = await supabase
      .from("app_pages")
      .select("id")
      .eq("slug", newSlug)
      .eq("app", this.appId)
      .eq("dynamic", page.dynamic)
      .neq("id", page.id);

    if (error) {
      throw new ActionError(
        "Failed to validate slug availability",
        "SLUG_VALIDATION_FAILED"
      );
    }

    if (data && data.length > 0) {
      throw new ActionError(
        `Slug '${newSlug}' is already in use`,
        "SLUG_ALREADY_EXISTS"
      );
    }
  }
}
