import { z } from "zod";
import { getSupabaseAdmin } from "../../../supabase";
import { ActionError } from "./action-error";
import { BaseAction } from "./base-action";

/**
 * Data type for UpdatePageMetadataAction
 */
type UpdatePageMetadataActionData = {
  id: string;
  metadata: Record<string, unknown>;
};

type UpdatePageMetadataActionResponse = {
  success: boolean;
};

/**
 * Action to update page metadata
 */
export class UpdatePageMetadataAction extends BaseAction<
  UpdatePageMetadataActionData,
  UpdatePageMetadataActionResponse
> {
  /**
   * Define the validation schema for update page metadata action
   */
  protected getValidationSchema() {
    return z.object({
      id: z.string().nonempty(),
      metadata: z.record(z.string(), z.any()),
    });
  }

  /**
   * Execute the update page metadata action
   */
  async execute(data: UpdatePageMetadataActionData): Promise<UpdatePageMetadataActionResponse> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
    const supabase = await getSupabaseAdmin();
    try {
      const { data: originalPage } = await supabase
        .from("app_pages")
        .select("*")
        .eq("id", data.id)
        .eq("app", this.context.appId)
        .single();

      if (!originalPage) {
        throw new ActionError("Page not found", "PAGE_NOT_FOUND");
      }

      const { error } = await supabase
        .from("app_pages")
        .update({ metadata: data.metadata })
        .eq("id", data.id)
        .eq("app", this.context.appId);

      if (error) {
        console.error(error);
        throw new ActionError("Failed to update page metadata", "UPDATE_FAILED", error);
      }

      return { success: true };
    } catch {
      throw new ActionError("Failed to update page metadata", "UPDATE_FAILED");
    }
  }
}
