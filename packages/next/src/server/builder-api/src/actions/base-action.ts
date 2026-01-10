import { z } from "zod";
import { getSupabaseAdmin } from "../../../supabase";
import { ChaiBuilderDAM } from "../ChaiBuilderDAM";
import { ActionError } from "./action-error";
import { ActionContext, ChaiAction } from "./chai-action-interface";

/**
 * Base Action Class
 * Provides common functionality for all action handlers
 */
export abstract class BaseAction<T = any, K = any> implements ChaiAction<T, K> {
  protected context: ActionContext | null = null;
  /**
   * Abstract method to get the validation schema for the action data
   * Each action must implement this to define its own validation rules
   */
  protected abstract getValidationSchema(): z.ZodType<T>;

  /**
   * Validate the action data using the schema provided by getValidationSchema
   * @param data The data to validate
   * @returns true if the data is valid, false otherwise
   */
  validate(data: T): boolean {
    if (!data) return true;
    try {
      const schema = this.getValidationSchema();
      schema.parse(data);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get validation errors for the action data
   * This can be useful for debugging or providing more detailed error messages
   * @param data The data to validate
   * @returns An array of validation errors or null if the data is valid
   */
  getValidationErrors(data: T): string | null {
    if (!data) return null;
    try {
      const schema = this.getValidationSchema();
      schema.parse(data);
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues.map((err: any) => `${err.path.join(".")}: ${err.message}`).join(", ");
        return errorMessages;
      }
      return null;
    }
  }

  /**
   * Set the action context
   * @param context The context to set
   */
  setContext(context: ActionContext): void {
    this.context = context;
  }

  getDb() {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
    return this.context.db;
  }

  /**
   * Abstract method to execute the action
   * Each action must implement this to define its own business logic
   */
  abstract execute(data: T): Promise<any>;

  /**
   * Helper method to handle common errors in actions
   * @param error The error to handle
   * @throws ActionError with appropriate message and code
   */
  protected handleError(error: unknown): never {
    if (error instanceof ActionError) {
      // Re-throw ActionError as is
      throw error;
    } else if (error instanceof z.ZodError) {
      // Convert Zod validation errors to ActionError
      const errorMessage = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      throw new ActionError(`Validation failed: ${errorMessage}`, "VALIDATION_ERROR");
    } else {
      // Convert other errors to ActionError
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new ActionError(message, "ACTION_ERROR");
    }
  }

  /**
   * Helper method to upload preview image to storage
   * @param previewImage Base64 encoded image
   * @param appId The app ID
   * @param userId The user ID
   * @param libraryId The library ID for path generation
   * @returns The uploaded image URL or null if no image provided
   * @throws ActionError if upload fails
   */
  protected async uploadPreviewImage(
    previewImage: string | undefined,
    appId: string,
    userId: string | null,
    libraryId: string,
  ): Promise<string | null> {
    if (!previewImage) {
      return null;
    }

    const supabase = await getSupabaseAdmin();
    const dam = new ChaiBuilderDAM(supabase, appId, userId ?? "");
    const uploadedImage = await dam.uploadAssetToStorage({
      base64File: previewImage,
      path: "library-previews/" + libraryId,
    });

    if (uploadedImage.error) {
      throw new ActionError(`Failed to upload preview image: ${uploadedImage.error}`, "UPLOAD_PREVIEW_FAILED");
    }

    return uploadedImage.url ?? null;
  }
}
