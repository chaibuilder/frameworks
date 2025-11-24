import { reverse } from "lodash";
import { z } from "zod";
import { getSupabaseAdmin } from "../../../supabase";
import { CHAI_ONLINE_PAGES_TABLE_NAME, CHAI_PAGES_REVISIONS_TABLE_NAME, CHAI_PAGES_TABLE_NAME } from "../CONSTANTS";
import { apiError } from "../lib";
import { PageTreeBuilder, PageTreeNode } from "../utils/page-tree-builder";
import { ActionError } from "./action-error";
import { BaseAction } from "./base-action";

/**
 * Data type for DeletePageAction
 */
type DeletePageActionData = {
  id: string;
};

type DeletePageActionResponse = {
  tags: string[];
  page?: any;
  deletedLanguagePages?: number;
  deletedNestedChildren?: number;
  totalDeleted?: number;
  code?: string;
  editor?: string;
};

/**
 * Action to delete a page and all its associated data
 * This includes:
 * - The page itself
 * - All nested children pages
 * - All language variant pages
 * - Language variants of nested children
 */
export class DeletePageAction extends BaseAction<DeletePageActionData, DeletePageActionResponse> {
  private supabase: any;
  private appId: string = "";
  private userId: string = "";
  private pageTreeBuilder?: PageTreeBuilder;

  /**
   * Define the validation schema for delete page action
   */
  protected getValidationSchema() {
    return z.object({
      id: z.string().nonempty("Page ID is required"),
    });
  }

  /**
   * Execute the delete page action
   */
  async execute(data: DeletePageActionData): Promise<DeletePageActionResponse> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }

    this.appId = this.context.appId;
    this.userId = this.context.userId || "";

    try {
      this.supabase = await getSupabaseAdmin();

      // Initialize PageTreeBuilder
      this.pageTreeBuilder = new PageTreeBuilder(this.supabase, this.appId);

      // Execute the delete operation
      return await this.deletePage(data.id);
    } catch (error) {
      // Handle known errors
      if (error instanceof ActionError) {
        throw error;
      }

      // Convert other errors to ActionError
      const message = error instanceof Error ? error.message : "Failed to delete page";
      throw new ActionError(message, "DELETE_PAGE_ERROR");
    }
  }

  /**
   * Main delete page logic
   */
  public async deletePage(id: string): Promise<any> {
    // Check if page is currently being edited by another user
    const currentEditor = await this.getCurrentEditor(id);
    if (currentEditor && currentEditor !== this.userId) {
      return { tags: [], code: "PAGE_LOCKED", editor: currentEditor };
    }

    const pagesTree = await this.pageTreeBuilder!.getPagesTree();

    const partialPage = this.pageTreeBuilder!.findPageInPartialTree(id, pagesTree.partialTree);
    if (partialPage) {
      return await this.deletePartialPageWithTree(id, partialPage, pagesTree);
    }

    const pageInLanguageTree = this.pageTreeBuilder!.findPageInLanguageTree(id, pagesTree.languageTree);
    const isLanguagePage = pageInLanguageTree !== null;

    if (isLanguagePage) {
      return await this.deleteLanguagePageWithTree(id, pageInLanguageTree!, pagesTree);
    } else {
      return await this.deletePrimaryPageWithTree(id, pagesTree);
    }
  }

  /**
   * Perform Deletion With Ids
   */
  public async performDeletionWithIds(ids: string[]): Promise<any> {
    const reverseIds = reverse(ids);
    const { error } = await this.supabase.from("library_templates").delete().in("pageId", reverseIds);
    if (error) {
      throw apiError("DELETE_FAILED", error);
    }
    const { error: revisionsError } = await this.supabase
      .from(CHAI_PAGES_REVISIONS_TABLE_NAME)
      .delete()
      .in("id", reverseIds);
    if (revisionsError) {
      throw apiError("DELETE_FAILED", revisionsError);
    }
    const { error: pagesError } = await this.supabase.from(CHAI_PAGES_TABLE_NAME).delete().in("id", reverseIds);
    if (pagesError) {
      throw apiError("DELETE_FAILED", pagesError);
    }
    const { error: onlinePagesError } = await this.supabase
      .from(CHAI_ONLINE_PAGES_TABLE_NAME)
      .delete()
      .in("id", reverseIds);
    if (onlinePagesError) {
      throw apiError("DELETE_FAILED", onlinePagesError);
    }
    const { error: onlinePagesError2 } = await this.supabase
      .from(CHAI_ONLINE_PAGES_TABLE_NAME)
      .delete()
      .in("primaryPage", reverseIds);
    if (onlinePagesError2) {
      throw apiError("DELETE_FAILED", onlinePagesError2);
    }
  }

  /**
   * Delete a partial page (global/form) using tree data
   */
  public async deletePartialPageWithTree(id: string, partialNode: PageTreeNode, pagesTree: any): Promise<any> {
    const isPrimaryPartial = partialNode.primaryPage === null;

    if (isPrimaryPartial) {
      // Find all language variants of this partial page
      const languageVariants = pagesTree.partialTree.filter((node: PageTreeNode) => node.primaryPage === id);

      const languageVariantIds = languageVariants.map((variant: PageTreeNode) => variant.id);

      await this.performDeletionWithIds([id, ...languageVariantIds]);

      return {
        tags: [`page-${id}`, ...languageVariantIds.map((id: string) => `page-${id}`)],
        totalDeleted: 1 + languageVariantIds.length,
      };
    } else {
      await this.performDeletionWithIds([id]);
      return {
        tags: [`page-${id}`],
        totalDeleted: 1,
      };
    }
  }

  /**
   * Delete a language page using tree data
   */
  public async deleteLanguagePageWithTree(id: string, langNode: any, pagesTree: any): Promise<any> {
    const primaryPageId = langNode.primaryPage;
    const primaryNode = this.pageTreeBuilder!.findPageInPrimaryTree(primaryPageId, pagesTree.primaryTree);

    if (!primaryNode) {
      throw apiError("ERROR_DELETING_PAGE", "Primary page not found");
    }

    const siblingLanguagePages = this.pageTreeBuilder!.findLanguagePagesForPrimary(
      primaryPageId,
      pagesTree.languageTree,
    );
    const siblingLanguagePageIds: string[] = [];

    siblingLanguagePages.forEach((sibling) => {
      if (sibling.id !== id) {
        siblingLanguagePageIds.push(sibling.id);
        const nestedIds = this.pageTreeBuilder!.collectNestedLanguageIds(sibling);
        siblingLanguagePageIds.push(...nestedIds);
      }
    });

    const nestedPrimaryChildIds = this.pageTreeBuilder!.collectNestedChildIds(primaryNode);

    const nestedLanguagePageIds: string[] = [];
    for (const primaryChildId of nestedPrimaryChildIds) {
      const langVariants = this.pageTreeBuilder!.findLanguagePagesForPrimary(primaryChildId, pagesTree.languageTree);
      langVariants.forEach((variant) => {
        nestedLanguagePageIds.push(variant.id);
        const nestedIds = this.pageTreeBuilder!.collectNestedLanguageIds(variant);
        nestedLanguagePageIds.push(...nestedIds);
      });
    }
    const directNestedLanguageIds = this.pageTreeBuilder!.collectNestedLanguageIds(langNode);
    const allNestedLanguageIds = [
      ...new Set([...siblingLanguagePageIds, ...directNestedLanguageIds, ...nestedLanguagePageIds]),
    ];

    await this.performDeletionWithIds([id, ...allNestedLanguageIds]);
    return {
      tags: [`page-${id}`, ...allNestedLanguageIds.map((id) => `page-${id}`)],
      totalDeleted: 1 + allNestedLanguageIds.length,
    };
  }

  /**
   * Delete a primary page using tree data
   */
  public async deletePrimaryPageWithTree(id: string, pagesTree: any): Promise<any> {
    const primaryNode = this.pageTreeBuilder!.findPageInPrimaryTree(id, pagesTree.primaryTree);

    if (!primaryNode) {
      throw apiError("ERROR_DELETING_PAGE", "Primary page not found");
    }
    const nestedPrimaryChildIds = this.pageTreeBuilder!.collectNestedChildIds(primaryNode);

    const languageVariants = this.pageTreeBuilder!.findLanguagePagesForPrimary(id, pagesTree.languageTree);
    const languagePageIds: string[] = [];

    languageVariants.forEach((langVariant) => {
      languagePageIds.push(langVariant.id);
      const nestedIds = this.pageTreeBuilder!.collectNestedLanguageIds(langVariant);
      languagePageIds.push(...nestedIds);
    });

    const allLanguagePageIds = [...new Set([...nestedPrimaryChildIds, ...languagePageIds])];
    await this.performDeletionWithIds([id, ...allLanguagePageIds]);
    return {
      tags: [`page-${id}`, ...allLanguagePageIds.map((id) => `page-${id}`)],
      totalDeleted: 1 + allLanguagePageIds.length,
    };
  }

  /**
   * Get current editor for a page
   */
  public async getCurrentEditor(id: string): Promise<string | null> {
    const { data: pageData } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select("currentEditor")
      .eq("id", id)
      .eq("app", this.appId)
      .single();

    return pageData?.currentEditor;
  }
}
