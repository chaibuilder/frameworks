import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, safeQuery, schema } from "../../../db";
import { getSupabaseAdmin } from "../../../supabase";
import { ChaiBuilderDAM } from "../ChaiBuilderDAM";
import { ActionError } from "./action-error";
import { BaseAction } from "./base-action";

/**
 * Data type for MarkAsTemplateAction
 */
type MarkAsTemplateActionData = {
  id: string;
  description?: string;
  name: string;
  pageType: string;
  previewImage?: string; // Base64 image to upload
  previewImageUrl?: string; // Pre-uploaded image URL (if already handled externally)
};

type MarkAsTemplateActionResponse = {
  id: string;
  library: string | null;
  pageType: string | null;
  pageId: string | null;
  description: string | null;
  preview: string | null;
};

/**
 * Action to mark a page as a template
 */
export class MarkAsTemplateAction extends BaseAction<MarkAsTemplateActionData, MarkAsTemplateActionResponse> {
  /**
   * Define the validation schema for mark as template action
   */
  protected getValidationSchema() {
    return z.object({
      id: z.string().min(1),
      description: z.string().optional(),
      name: z.string().min(1),
      pageType: z.string().min(1),
      previewImage: z.string().optional(),
      previewImageUrl: z.string().optional(),
    });
  }

  /**
   * Execute the mark as template action
   */
  async execute(data: MarkAsTemplateActionData): Promise<MarkAsTemplateActionResponse> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
    const { appId, userId } = this.context;
    const supabase = await getSupabaseAdmin();
    const { id: pageId, description, name, pageType, previewImage, previewImageUrl } = data;

    let finalPreviewImageUrl = previewImageUrl;

    // Get the site library for this app
    const { data: siteLibrary, error: libraryError } = await safeQuery(() =>
      db.query.libraries.findFirst({
        where: eq(schema.libraries.app, appId),
        columns: {
          id: true,
        },
      }),
    );

    if (libraryError) {
      throw new ActionError("Failed to fetch site library", "GET_SITE_LIBRARY_FAILED", libraryError);
    }

    if (!siteLibrary) {
      throw new ActionError("Library not found for this app", "GET_SITE_LIBRARY_FAILED");
    }

    // Handle preview image upload if provided
    if (previewImage) {
      const dam = new ChaiBuilderDAM(supabase, appId, userId ?? "");
      const uploadedImage = await dam.uploadAssetToStorage({
        base64File: previewImage,
        path: "library-previews/" + siteLibrary.id,
      });

      if (uploadedImage.error) {
        throw new ActionError(`Failed to upload preview image: ${uploadedImage.error}`, "UPLOAD_PREVIEW_FAILED");
      }

      if (uploadedImage.url) {
        finalPreviewImageUrl = uploadedImage.url;
      }
    }

    // Insert the template
    const { data: template, error } = await safeQuery(() =>
      db
        .insert(schema.libraryTemplates)
        .values({
          library: siteLibrary.id,
          user: userId ?? null,
          pageId: pageId,
          description: description ?? null,
          name: name + " Template",
          pageType: pageType,
          preview: finalPreviewImageUrl ?? null,
        })
        .returning({
          id: schema.libraryTemplates.id,
          library: schema.libraryTemplates.library,
          pageType: schema.libraryTemplates.pageType,
          pageId: schema.libraryTemplates.pageId,
          description: schema.libraryTemplates.description,
          preview: schema.libraryTemplates.preview,
        }),
    );

    if (error || !template || template.length === 0) {
      throw new ActionError("Failed to mark page as template", "UPDATE_FAILED", error);
    }

    return template[0]!;
  }
}
