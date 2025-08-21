import { ChaiBlock } from "@chaibuilder/sdk";
import { keys, pick } from "lodash";
import { z } from "zod";
import { getSupabaseAdmin } from "../../../supabase";
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

    try {
      const filteredData = this.extractAllowedPageFields(data);

      // Handle slug changes if detected
      await this.handleSlugChangeIfNeeded(data.id, filteredData);

      await this.updatePageInDatabase(data.id, filteredData);
      return await this.buildResponse(data.id, filteredData);
    } catch (error) {
      return this.handleExecutionError(error);
    }
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
   * Handle slug changes if detected in the update data
   */
  private async handleSlugChangeIfNeeded(pageId: string, filteredData: Partial<UpdatePageActionData>): Promise<void> {
    if (!filteredData.slug) {
      return;
    }

    const slugHandler = new SlugChangeHandler(this.context!.appId);

    // Check if slug has actually changed
    const hasChanged = await slugHandler.hasSlugChanged(pageId, filteredData.slug);
    if (!hasChanged) {
      return;
    }

    // Validate that the new slug is available
    await slugHandler.validateSlugAvailability(filteredData.slug, pageId);

    // Handle the slug change process
    await slugHandler.handleSlugChange(pageId, filteredData.slug);
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
   * Update the page in the database
   */
  private async updatePageInDatabase(pageId: string, filteredData: Partial<UpdatePageActionData>): Promise<void> {
    const changes = this.determineChangeTypes(filteredData);
    const supabase = await getSupabaseAdmin();
    const { error } = await supabase
      .from("app_pages")
      .update({
        ...filteredData,
        changes,
        lastSaved: "now()",
      })
      .eq("app", this.context!.appId)
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
    return dataKeys.includes("blocks") && dataKeys.length === 1;
  }

  /**
   * Fetch the updated page data from database
   */
  private async fetchUpdatedPageData(pageId: string): Promise<any> {
    const supabase = await getSupabaseAdmin();
    const { data: updatedPage, error: updatedPageError } = await supabase
      .from("app_pages")
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
