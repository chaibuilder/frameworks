import { pick } from "lodash";
import { getSupabaseAdmin } from "../../../supabase";
import { CHAI_ONLINE_PAGES_TABLE_NAME, CHAI_PAGES_TABLE_NAME } from "../CONSTANTS";
import { PageTreeBuilder } from "../utils/page-tree-builder";
import { ActionError } from "./action-error";

/**
 * Handler for managing slug changes and their cascading effects
 */
export class SlugChangeHandler {
  private appId: string;
  private supabase: any;
  private pageTreeBuilder?: PageTreeBuilder;

  constructor(appId: string, supabase?: any) {
    this.appId = appId;
    this.supabase = supabase;
  }

  /**
   * Validate that the new slug doesn't conflict with existing pages using tree data
   */
  private validateSlugAvailabilityInTree(newSlug: string, pageId: string, isDynamic: boolean, pagesTree: any): void {
    // Helper function to recursively check all nodes in a tree
    const hasConflict = (nodes: any[]): boolean => {
      for (const node of nodes) {
        // Check current node - use nullish coalescing (??) to handle undefined, and strict equality (===) for comparison
        const nodeIsDynamic = node.dynamic ?? false;
        if (node.slug === newSlug && node.id !== pageId && nodeIsDynamic === isDynamic) {
          return true;
        }
        // Recursively check children
        if (node.children && node.children.length > 0) {
          if (hasConflict(node.children)) {
            return true;
          }
        }
      }
      return false;
    };

    // Check in primary tree
    if (hasConflict(pagesTree.primaryTree)) {
      throw new ActionError(`Slug '${newSlug}' is already in use`, "SLUG_ALREADY_EXISTS");
    }

    // Check in language tree
    if (hasConflict(pagesTree.languageTree)) {
      throw new ActionError(`Slug '${newSlug}' is already in use`, "SLUG_ALREADY_EXISTS");
    }
  }

  /**
   * Check if slug has changed (lightweight check without DB query)
   */
  async isSlugChanged(pageId: string, newSlug?: string): Promise<boolean> {
    if (!newSlug) {
      return false;
    }

    const supabase = this.supabase || (await getSupabaseAdmin());
    const { data: pageData } = await supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select("slug")
      .eq("id", pageId)
      .eq("app", this.appId)
      .single();

    return pageData?.slug !== newSlug;
  }

  /**
   * Check if the parent is being changed (lightweight check without DB query)
   */
  async isParentChanged(pageId: string, newParent?: string | null): Promise<boolean> {
    if (newParent === undefined) return false;

    const supabase = this.supabase || (await getSupabaseAdmin());
    const { data: currentPage } = await supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select("parent")
      .eq("id", pageId)
      .eq("app", this.appId)
      .single();

    return currentPage?.parent !== newParent;
  }

  /**
   * Handle slug change using PageTreeBuilder (ONLY 1 DB query - the tree fetch)
   */
  async handleSlugChangeWithTree(pageId: string, filteredData: any): Promise<Array<{ id: string; newSlug: string }>> {
    const newSlug = filteredData.slug!;
    const supabase = this.supabase || (await getSupabaseAdmin());

    // Initialize PageTreeBuilder if not already done
    if (!this.pageTreeBuilder) {
      this.pageTreeBuilder = new PageTreeBuilder(supabase, this.appId, false);
    }

    // SINGLE DB QUERY: Get pages tree (fetches all pages at once)
    const pagesTree = await this.pageTreeBuilder.getPagesTree();

    // Find the page in the tree (no DB query needed)
    let currentPageNode = this.pageTreeBuilder.findPageInPrimaryTree(pageId, pagesTree.primaryTree);

    if (!currentPageNode) {
      // Try to find in language tree
      currentPageNode = this.pageTreeBuilder.findPageInLanguageTree(pageId, pagesTree.languageTree);

      if (!currentPageNode) {
        throw new ActionError("Page not found in tree", "PAGE_NOT_FOUND_IN_TREE");
      }
    }

    const oldSlug = currentPageNode.slug;
    const isDynamic = currentPageNode.dynamic || false;

    // Validate slug availability using tree data (no DB query)
    this.validateSlugAvailabilityInTree(newSlug, pageId, isDynamic, pagesTree);

    let slugUpdates: Array<{ id: string; newSlug: string }> = [];
    // Collect nested children slug updates
    const childSlugUpdates = this.pageTreeBuilder.collectNestedChildSlugs(currentPageNode, oldSlug, newSlug);
    slugUpdates = [{ id: pageId, newSlug }, ...childSlugUpdates.map((u) => ({ id: u.id, newSlug: u.newSlug }))];

    return slugUpdates;
  }

  /**
   * Handle parent change by recalculating slugs for the page and its children (ONLY 1 DB query - the tree fetch)
   */
  async handleParentChangeWithTree(pageId: string, filteredData: any): Promise<Array<{ id: string; newSlug: string }>> {
    const newParent = filteredData.parent!;
    const supabase = this.supabase || (await getSupabaseAdmin());

    // Initialize PageTreeBuilder if not already done
    if (!this.pageTreeBuilder) {
      this.pageTreeBuilder = new PageTreeBuilder(supabase, this.appId, false);
    }

    // SINGLE DB QUERY: Get pages tree (fetches all pages at once)
    const pagesTree = await this.pageTreeBuilder.getPagesTree();

    // Find the page in the tree (no DB query needed)
    const primaryNode = this.pageTreeBuilder.findPageInPrimaryTree(pageId, pagesTree.primaryTree);
    if (!primaryNode) {
      // Check if it's a language page trying to change parent
      const langNode = this.pageTreeBuilder.findPageInLanguageTree(pageId, pagesTree.languageTree);
      if (langNode) {
        throw new ActionError("Cannot change parent of language pages directly", "INVALID_OPERATION");
      }
      throw new ActionError("Primary page not found in tree", "PAGE_NOT_FOUND_IN_TREE");
    }

    const oldSlug = primaryNode.slug;

    // Calculate new slug based on new parent it can also have slug change
    const newSlug = filteredData.slug
      ? filteredData.slug
      : this.pageTreeBuilder.calculateSlugFromParent(newParent, oldSlug, pagesTree.primaryTree);

    // Validate new slug availability using tree data (no DB query)
    this.validateSlugAvailabilityInTree(newSlug, pageId, primaryNode.dynamic || false, pagesTree);

    // Collect nested children slug updates for primary page
    const childSlugUpdates = this.pageTreeBuilder.collectNestedChildSlugs(primaryNode, oldSlug, newSlug);
    const slugUpdates: Array<{ id: string; newSlug: string }> = [
      { id: pageId, newSlug },
      ...childSlugUpdates.map((u) => ({ id: u.id, newSlug: u.newSlug })),
    ];

    // Also handle language variants when parent changes
    const languageVariants = this.pageTreeBuilder.findLanguagePagesForPrimary(pageId, pagesTree.languageTree);
    for (const langVariant of languageVariants) {
      // Calculate new slug for language variant, preserving language prefix
      const langVariantNewSlug = this.pageTreeBuilder.calculateLanguageVariantSlug(langVariant, newSlug);

      // Collect nested children slug updates for language variant
      const langChildSlugUpdates = this.pageTreeBuilder.collectNestedChildSlugs(
        langVariant,
        langVariant.slug,
        langVariantNewSlug,
      );

      slugUpdates.push({ id: langVariant.id, newSlug: langVariantNewSlug });
      slugUpdates.push(...langChildSlugUpdates.map((u) => ({ id: u.id, newSlug: u.newSlug })));
    }

    return slugUpdates;
  }

  /**
   * Batch update slugs in both app_pages and app_pages_online tables
   */
  async batchUpdateSlugs(
    slugUpdates: Array<{ id: string; newSlug: string }>,
    filteredData: any,
    mainPageId: string,
    changes: string[],
  ): Promise<void> {
    const supabase = this.supabase || (await getSupabaseAdmin());

    // Update app_pages table in parallel
    const pageUpdatePromises = slugUpdates.map(async (update) => {
      const updateData: any = {
        slug: update.newSlug,
        lastSaved: "now()",
      };

      // Only add other fields for the main page being updated
      if (update.id === mainPageId) {
        Object.assign(updateData, {
          ...pick(filteredData, [
            "name",
            "seo",
            "blocks",
            "currentEditor",
            "buildTime",
            "parent",
            "pageType",
            "dynamic",
            "dynamicSlugCustom",
            "tracking",
          ]),
          changes,
        });
      }

      const { error } = await supabase
        .from(CHAI_PAGES_TABLE_NAME)
        .update(updateData)
        .eq("id", update.id)
        .eq("app", this.appId);

      if (error) {
        throw new ActionError(`Failed to update page ${update.id}`, "UPDATE_PAGE_FAILED");
      }

      return update.id;
    });

    // Wait for all page updates to complete, will throw on first error
    await Promise.all(pageUpdatePromises);

    // Update app_pages_online table in parallel
    // Ignore errors for online table as pages might not be published
    const onlineUpdatePromises = slugUpdates.map(async (update) => {
      try {
        await supabase
          .from(CHAI_ONLINE_PAGES_TABLE_NAME)
          .update({ slug: update.newSlug })
          .eq("id", update.id)
          .eq("app", this.appId);
      } catch (error) {
        // Silently ignore errors for online table
      }
    });

    await Promise.all(onlineUpdatePromises);
  }

  /**
   * Set the PageTreeBuilder instance
   */
  setPageTreeBuilder(builder: PageTreeBuilder): void {
    this.pageTreeBuilder = builder;
  }

  /**
   * Set the Supabase instance
   */
  setSupabase(supabase: any): void {
    this.supabase = supabase;
  }
}
