import { each, isEmpty } from "lodash";
import { z } from "zod";
import { getSupabaseAdmin } from "../../../supabase";
import { CHAI_PAGES_TABLE_NAME } from "../CONSTANTS";
import { apiError } from "../lib";
import { BaseAction } from "./base-action";

type BlocksWithDesignTokens = Record<string, Record<string, string>>;
export interface SiteWideUsage {
  [pageId: string]: {
    name: string;
    isPartial: boolean;
    partialBlocks: string[];
    links: string[];
    designTokens: BlocksWithDesignTokens; // { TokenName: {blockId: Name, blockId: name 2}}
  };
}
/**
 * Data type for GenerateSeoFieldAction
 */
type GetSiteWideDataActionData = undefined;

type GetSiteWideDataActionResponse = SiteWideUsage;

/**
 * Action to generate SEO fields for a page
 */
export class GetSiteWideDataAction extends BaseAction<GetSiteWideDataActionData, GetSiteWideDataActionResponse> {
  /**
   * Define the validation schema for duplicate page action
   */
  protected getValidationSchema() {
    return z.undefined();
  }

  /**
   * Execute the duplicate page action
   */
  async execute(data: GetSiteWideDataActionData): Promise<GetSiteWideDataActionResponse> {
    if (!this.context) {
      throw apiError("CONTEXT_NOT_SET", new Error("CONTEXT_NOT_SET"));
    }
    const supabase = await getSupabaseAdmin();
    const { data: blocksData, error } = await supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select("id, designTokens, name, slug, links, partialBlocks")
      .eq("lang", "")
      .eq("app", this.context.appId);

    const siteWideData: SiteWideUsage = {};
    each(blocksData, (page) => {
      siteWideData[page.id] = {
        name: page.name,
        isPartial: isEmpty(page.slug),
        partialBlocks: !page.partialBlocks ? [] : page.partialBlocks?.split("|").filter(Boolean),
        links: !page.links ? [] : page.links.split("|").filter(Boolean),
        designTokens: page.designTokens ?? {},
      };
    });
    return siteWideData;
  }
}
