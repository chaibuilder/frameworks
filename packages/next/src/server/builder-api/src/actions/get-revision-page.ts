import { supabase } from "@/app/supabase";
import { ChaiBlock } from "@chaibuilder/sdk";
import { z } from "zod";
import { ChaiBuilderPageBlocks } from "../ChaiBuilderPageBlocks";
import { apiError } from "../lib";
import { BaseAction } from "./base-action";

/**
 * Data type for GenerateSeoFieldAction
 */
type GetRevisionPageActionData = {
  id: string;
  type: "draft" | "live" | "revision";
  lang?: string;
};

type GetRevisionPageActionResponse = {
  id: string;
  blocks: ChaiBlock[];
} & Record<string, any>;

/**
 * Action to generate SEO fields for a page
 */
export class GetRevisionPageAction extends BaseAction<
  GetRevisionPageActionData,
  GetRevisionPageActionResponse
> {
  /**
   * Define the validation schema for duplicate page action
   */
  protected getValidationSchema() {
    return z.object({
      id: z.string().nonempty(),
      type: z.enum(["draft", "live", "revision"]),
    });
  }

  /**
   * Execute the duplicate page action
   */
  async execute(
    data: GetRevisionPageActionData
  ): Promise<GetRevisionPageActionResponse> {
    if (!this.context) {
      throw apiError("CONTEXT_NOT_SET", new Error("CONTEXT_NOT_SET"));
    }
    const tableName = this.getTableName(data.type);
    const column = this.getColumn(data.type);
    const { data: blocksData, error } = await supabase
      .from(tableName)
      .select("*")
      .eq(column, data.id)
      .eq("lang", data.lang ?? "")
      .single();

    if (error) {
      throw apiError("NOT_FOUND", error);
    }

    const pageBlocks = new ChaiBuilderPageBlocks(supabase, this.context.appId);

    let blocks = blocksData?.blocks ?? [];
    blocks = await pageBlocks.getMergedBlocks(
      blocks,
      tableName === "app_pages"
    );
    return {
      ...blocksData,
      blocks,
    };
  }

  getTableName(type: "draft" | "live" | "revision") {
    if (type === "draft") {
      return "app_pages";
    } else if (type === "live") {
      return "app_pages_online";
    } else {
      return "app_pages_revisions";
    }
  }

  getColumn(type: "draft" | "live" | "revision") {
    if (type === "draft" || type === "live") {
      return "id";
    } else {
      return "uid";
    }
  }
}
