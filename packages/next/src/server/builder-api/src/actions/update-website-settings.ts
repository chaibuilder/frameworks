import { eq } from "drizzle-orm";
import { pick } from "lodash";
import { z } from "zod";
import { db, safeQuery, schema } from "../../../../server/db";
import { apiError } from "../lib";
import { ChaiBaseAction } from "./base-action";

type UpdateWebsiteSettingsActionData = {
  settings: any;
};

type UpdateWebsiteSettingsActionResponse = {
  success: boolean;
};

/**
 * Action to update website settings (theme, designTokens, etc.)
 * Matches the behavior of the old ChaiBuilderWebsite.updateWebsiteSettings method
 */
export class UpdateWebsiteSettingsAction extends ChaiBaseAction<
  UpdateWebsiteSettingsActionData,
  UpdateWebsiteSettingsActionResponse
> {
  protected getValidationSchema() {
    return z.object({
      settings: z.any(),
    });
  }

  async execute(data: UpdateWebsiteSettingsActionData): Promise<UpdateWebsiteSettingsActionResponse> {
    if (!this.context) {
      throw apiError("CONTEXT_NOT_SET", new Error("CONTEXT_NOT_SET"));
    }

    const { appId } = this.context;

    // Pick only the allowed columns from settings (matching old implementation)
    const columns = pick(data.settings, ["theme", "designTokens"]);

    // Build the update object with changes flag
    const updateData = {
      ...columns,
      changes: ["Updated"],
    };

    // Execute the update query
    const { error } = await safeQuery(() => db.update(schema.apps).set(updateData).where(eq(schema.apps.id, appId)));

    if (error) {
      throw apiError("ERROR_UPDATE_WEBSITE_SETTINGS", error);
    }

    return { success: true };
  }
}
