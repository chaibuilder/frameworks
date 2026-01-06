import { eq } from "drizzle-orm";
import { first } from "lodash";
import { z } from "zod";
import { db, safeQuery, schema } from "../../../../server/db";
import { apiError } from "../lib";
import { BaseAction } from "./base-action";

type UpdateWebsiteDataActionData = {
  data: Record<string, any>;
};

type UpdateWebsiteDataActionResponse = {
  success: boolean;
};

export class UpdateWebsiteDataAction extends BaseAction<UpdateWebsiteDataActionData, UpdateWebsiteDataActionResponse> {
  protected getValidationSchema() {
    return z.object({
      data: z.record(z.string(), z.any()),
    });
  }

  async execute(data: UpdateWebsiteDataActionData): Promise<UpdateWebsiteDataActionResponse> {
    if (!this.context) {
      throw apiError("CONTEXT_NOT_SET", new Error("CONTEXT_NOT_SET"));
    }

    const { appId } = this.context;
    const { data: updateData } = data;

    // Get existing configData from the apps table
    const { data: existingData, error: fetchError } = await safeQuery(() =>
      db
        .select({
          configData: schema.apps.configData,
        })
        .from(schema.apps)
        .where(eq(schema.apps.id, appId))
        .limit(1),
    );

    if (fetchError) {
      throw apiError("ERROR_UPDATE_WEBSITE_DATA", fetchError);
    }

    if (!existingData || existingData.length === 0) {
      throw apiError("APP_NOT_FOUND", new Error("App not found"));
    }

    const currentData = first(existingData);
    const existingConfigData = (currentData?.configData as Record<string, any>) ?? {};

    // Merge existing data with new data
    const mergedData = {
      ...existingConfigData,
      ...updateData,
    };

    // Update the apps table with merged data and mark changes
    const { error: updateError } = await safeQuery(() =>
      db
        .update(schema.apps)
        .set({
          configData: mergedData,
          changes: ["Updated"],
        })
        .where(eq(schema.apps.id, appId)),
    );

    if (updateError) {
      throw apiError("ERROR_UPDATE_WEBSITE_DATA", updateError);
    }

    return { success: true };
  }
}
