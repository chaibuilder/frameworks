import { ChaiBlock } from "@chaibuilder/sdk";
import { compact, get, keys, pick } from "lodash";
import { z } from "zod";
import { getSupabaseAdmin } from "../../../supabase";
import { CHAI_PAGES_TABLE_NAME } from "../CONSTANTS";
import { PageTreeBuilder } from "../utils/page-tree-builder";
import { ActionError } from "./action-error";
import { BaseAction } from "./base-action";
import { SlugChangeHandler } from "./slug-change-handler";

/**
 * Data type for UpdatePageAction
 */
type UpdatePageActionData = {
  //primary keys
  id: string;

  // templates columns
  blocks?: ChaiBlock[];
  currentEditor?: string;

  // pages table
  slug?: string;
  name?: string;
  seo?: Record<string, any>;
  buildTime?: boolean;
  parent?: string | null;
  pageType?: string;
  dynamic?: boolean;
  dynamicSlugCustom?: string;
  tracking?: Record<string, any>;

  links?: string;
  partialBlocks?: string;
  designTokens?: string;
};

type UpdatePageActionResponse = {
  success?: boolean;
  page?: any;
  code?: string;
  editor?: string;
};

/**
 * Action to update a page
 */
export class UpdatePageAction extends BaseAction<UpdatePageActionData, UpdatePageActionResponse> {
  private supabase: any;
  private appId: string = "";
  private pageTreeBuilder?: PageTreeBuilder;
  private slugChangeHandler?: SlugChangeHandler;

  /**
   * Define the validation schema for update page action
   */
  protected getValidationSchema() {
    return z.object({
      id: z.string().nonempty(),
      blocks: z.array(z.any()).optional(),
      currentEditor: z.string().optional(),
      slug: z.string().optional(),
      name: z.string().optional(),
      seo: z.record(z.string(), z.any()).optional(),
      buildTime: z.boolean().optional(),
      parent: z.union([z.string(), z.null()]).optional(),
      pageType: z.string().optional(),
      dynamic: z.boolean().optional(),
      dynamicSlugCustom: z.string().optional(),
      tracking: z.record(z.string(), z.any()).optional(),
      needTranslations: z.boolean().optional(),
    });
  }

  /**
   * Execute the update page action
   */
  async execute(data: UpdatePageActionData): Promise<UpdatePageActionResponse> {
    this.validateContext();
    this.appId = this.context!.appId;

    try {
      this.supabase = await getSupabaseAdmin();

      if (this.isOnlyBlocksUpdate(data)) {
        await this.updateBlocks(data.id, data.blocks!);
        return await this.buildResponse(data.id, data);
      }

      const filteredData = this.extractAllowedPageFields(data);

      // Initialize SlugChangeHandler
      this.slugChangeHandler = new SlugChangeHandler(this.appId, this.supabase);

      // Check if slug or parent is being changed
      const isSlugChanged = await this.slugChangeHandler.isSlugChanged(data.id, filteredData.slug);
      const isParentChanged = await this.slugChangeHandler.isParentChanged(data.id, filteredData.parent);

      if (isParentChanged && filteredData.parent !== undefined) {
        // Parent change takes priority (it also updates slugs)
        // This handles both parent-only changes and parent+slug changes
        this.pageTreeBuilder = new PageTreeBuilder(this.supabase, this.appId, false);
        this.slugChangeHandler.setPageTreeBuilder(this.pageTreeBuilder);
        await this.handleParentChangeWithHandler(data.id, filteredData);
      } else if (isSlugChanged && filteredData.slug) {
        // Slug change only (no parent change)
        this.pageTreeBuilder = new PageTreeBuilder(this.supabase, this.appId, false);
        this.slugChangeHandler.setPageTreeBuilder(this.pageTreeBuilder);
        await this.handleSlugChangeWithHandler(data.id, filteredData);
      } else {
        // Simple update without slug or parent change
        await this.updatePageInDatabase(data.id, filteredData);
      }

      return await this.buildResponse(data.id, filteredData);
    } catch (error) {
      return this.handleExecutionError(error);
    }
  }

  async updateBlocks(pageId: string, blocks: ChaiBlock[]) {
    const links: string = this.getLinks(blocks);
    const partials: string = this.getPartialBlocks(blocks);
    const designTokens: string = this.getDesignTokens(blocks);
    console.log({ links, partials, designTokens });

    await this.updatePageInDatabase(pageId, { blocks, links, partialBlocks: partials, designTokens });
  }

  getPartialBlocks(blocks: ChaiBlock[]) {
    return compact(
      blocks
        .filter((block) => block._type === "GlobalBlock" || block._type === "PartialBlock")
        .map((block) => get(block, "partialBlockId", get(block, "globalBlock", false))),
    ).join("|");
  }

  getLinks(blocks: ChaiBlock[]) {
    const blocksStr = JSON.stringify(blocks);
    const regex = /pageType:[^:]+:([a-f0-9-]{36})/gi;
    const uuids: string[] = [];
    let match;
    while ((match = regex.exec(blocksStr)) !== null) {
      if (match[1]) uuids.push(match[1]);
    }
    return compact(uuids).join("|");
  }

  getDesignTokens(blocks: ChaiBlock[]) {
    const blocksStr = JSON.stringify(blocks);
    const regex = /dt-token_[^ "]+/g;
    const tokens: string[] = [];
    let match;
    while ((match = regex.exec(blocksStr)) !== null) {
      if (match[0]) tokens.push(match[0]);
    }
    return compact(tokens).join("|");
  }

  /**
   * Validate that context is properly set
   */
  private validateContext(): void {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
  }

  /**
   * Extract only the allowed fields for page updates
   */
  private extractAllowedPageFields(data: UpdatePageActionData): Partial<UpdatePageActionData> {
    return pick(data, [
      "slug",
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
    ]);
  }

  /**
   * Handle slug change using SlugChangeHandler
   */
  private async handleSlugChangeWithHandler(
    pageId: string,
    filteredData: Partial<UpdatePageActionData>,
  ): Promise<void> {
    // Get slug updates from handler
    const slugUpdates = await this.slugChangeHandler!.handleSlugChangeWithTree(pageId, filteredData);

    // Batch update all slugs
    const changes = this.determineChangeTypes(filteredData);
    await this.slugChangeHandler!.batchUpdateSlugs(slugUpdates, filteredData, pageId, changes);
  }

  /**
   * Handle parent change using SlugChangeHandler
   */
  private async handleParentChangeWithHandler(
    pageId: string,
    filteredData: Partial<UpdatePageActionData>,
  ): Promise<void> {
    // Get slug updates from handler
    const slugUpdates = await this.slugChangeHandler!.handleParentChangeWithTree(pageId, filteredData);

    // Batch update all slugs
    const changes = this.determineChangeTypes(filteredData);
    await this.slugChangeHandler!.batchUpdateSlugs(slugUpdates, filteredData, pageId, changes);
  }

  /**
   * Determine what type of changes are being made
   */
  private determineChangeTypes(filteredData: Partial<UpdatePageActionData>): string[] {
    const changes: string[] = [];
    const dataKeys = keys(filteredData);

    if (dataKeys.includes("blocks")) {
      changes.push("Page");
    }
    if (dataKeys.includes("seo")) {
      changes.push("SEO");
    }

    return changes.length > 0 ? changes : ["Updated"];
  }

  /**
   * Update the page in the database (simple update without slug change)
   */
  private async updatePageInDatabase(pageId: string, filteredData: Partial<UpdatePageActionData>): Promise<void> {
    const changes = this.determineChangeTypes(filteredData);
    const { error } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .update({
        ...filteredData,
        changes,
        lastSaved: "now()",
      })
      .eq("app", this.appId)
      .eq("id", pageId);

    if (error) {
      throw new ActionError("Error updating page", "ERROR_UPDATING_PAGE");
    }
  }

  /**
   * Check if only blocks are being updated
   */
  private isOnlyBlocksUpdate(filteredData: Partial<UpdatePageActionData>): boolean {
    const dataKeys = keys(filteredData);
    return dataKeys.includes("blocks");
  }

  /**
   * Fetch the updated page data from database
   */
  private async fetchUpdatedPageData(pageId: string): Promise<any> {
    const { data: updatedPage, error: updatedPageError } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select("id, slug, lang, pageType, name, online, parent, seo, tracking")
      .eq("id", pageId)
      .single();

    if (updatedPageError) {
      throw new ActionError("Error getting updated page", "ERROR_GETTING_PAGE");
    }

    return updatedPage;
  }

  /**
   * Build the appropriate response based on update type
   */
  private async buildResponse(
    pageId: string,
    filteredData: Partial<UpdatePageActionData>,
  ): Promise<UpdatePageActionResponse> {
    if (this.isOnlyBlocksUpdate(filteredData)) {
      return { success: true };
    }

    const updatedPage = await this.fetchUpdatedPageData(pageId);
    return { page: updatedPage };
  }

  /**
   * Handle execution errors with proper error transformation
   */
  private handleExecutionError(error: unknown): never {
    console.log("Error updating page:", error);
    if (error instanceof ActionError) {
      throw error;
    }

    throw new ActionError(
      `Failed to update page: ${error instanceof Error ? error.message : "Unknown error"}`,
      "UPDATE_PAGE_FAILED",
    );
  }
}
