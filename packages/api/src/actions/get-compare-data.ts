import { supabase } from "@/app/supabase";
import { ChaiBlock } from "@chaibuilder/sdk";
import { z } from "zod";
import { ActionError } from "./action-error";
import { BaseAction } from "./base-action";

/**
 * Data type for UpdatePageAction
 */
type GetCompareDataActionData = {
  versions: {
    version1: { type: "draft" | "revision" | "live"; id: string };
    version2: { type: "draft" | "revision" | "live"; id: string };
  };
};

type GetCompareDataActionResponse = {
  version1: {
    blocks: ChaiBlock[];
    seo: object,
    tracking: object;
  };
  version2: {
    blocks: ChaiBlock[];
    seo: object,
    tracking: object;
  };
};

/**
 * Action to update a page
 */
export class GetCompareDataAction extends BaseAction<
  GetCompareDataActionData,
  GetCompareDataActionResponse
> {
  /**
   * Define the validation schema for update page action
   */
  protected getValidationSchema() {
    return z.object({
      versions: z.object({
        version1: z.object({
          type: z.enum(["draft", "revision", "live"]),
          id: z.string(),
        }),
        version2: z.object({
          type: z.enum(["draft", "revision", "live"]),
          id: z.string(),
        }),
      }),
    });
  }

  /**
   * Execute the update page action
   */
  async execute(
    data: GetCompareDataActionData
  ): Promise<GetCompareDataActionResponse> {
    this.validateContext();

    // Get blocks for version1
    const version1Data = await this.getBlocksForVersion(
      data.versions.version1.type,
      data.versions.version1.id
    );

    // Get blocks for version2
    const version2Data = await this.getBlocksForVersion(
      data.versions.version2.type,
      data.versions.version2.id
    );

    return {
      version1: {
        blocks: version1Data.blocks,
        seo: version1Data.seo,
        tracking: version1Data.tracking,
      },
      version2: {
        blocks: version2Data.blocks,
        seo: version2Data.seo,
        tracking: version2Data.tracking,
      },
    };
  }

  /**
   * Get blocks from the appropriate table based on type
   */
  private async getBlocksForVersion(
    type: "draft" | "revision" | "live",
    id: string
  ): Promise<{blocks: ChaiBlock[], seo: any, tracking: any}> {
    let query;

    switch (type) {
      case "draft":
        // Get blocks from app_pages table
        query = supabase
          .from("app_pages")
          .select("blocks,seo,tracking")
          .eq("id", id)
          .single();
        break;

      case "live":
        // Get blocks from app_pages_online table
        query = supabase
          .from("app_pages_online")
          .select("blocks,seo,tracking")
          .eq("id", id)
          .single();
        break;

      case "revision":
        // Get blocks from app_pages_revisions table
        // Note: revisions use 'uid' as primary key
        query = supabase
          .from("app_pages_revisions")
          .select("blocks,seo,tracking")
          .eq("uid", id)
          .single();
        break;

      default:
        throw new ActionError(
          `Invalid version type: ${type}`,
          "INVALID_VERSION_TYPE"
        );
    }

    const { data, error } = await query;

    if (error) {
      throw new ActionError(
        `Failed to fetch blocks for ${type} version: ${error.message}`,
        "FETCH_BLOCKS_ERROR"
      );
    }

    if (!data) {
      throw new ActionError(
        `No data found for ${type} version with id: ${id}`,
        "VERSION_NOT_FOUND"
      );
    }

    // Return blocks or empty array if blocks is null/undefined
    return data
  }

  /**
   * Validate that context is properly set
   */
  private validateContext(): void {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
  }
}
