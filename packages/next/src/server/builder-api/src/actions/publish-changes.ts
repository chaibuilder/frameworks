import { and, eq, inArray, InferSelectModel, like } from "drizzle-orm";
import { flattenDeep, isEmpty, uniq } from "lodash";
import { z } from "zod";
import { db, safeQuery, schema } from "../../../db";
import { ActionError } from "./action-error";
import { ChaiBaseAction } from "./base-action";

/**
 * Data type for PublishChangesAction
 */
type PublishChangesActionData = {
  ids?: string[];
};

type PublishChangesActionResponse = {
  tags: string[];
};

/**
 * Type for App data from the database
 */
type AppData = InferSelectModel<typeof schema.apps>;

/**
 * Type for AppPage data from the database
 */
type AppPageData = InferSelectModel<typeof schema.appPages>;

/**
 * Type for the return value when adding a page online
 */
type AddOnlinePageResult = {
  id: string;
  primaryPage: string | null;
};

/**
 * Type for partial page data with only id field
 */
type PartialPageIdOnly = Pick<InferSelectModel<typeof schema.appPagesOnline>, "id">;

/**
 * Action to publish changes to pages or theme
 */
export class PublishChangesAction extends ChaiBaseAction<PublishChangesActionData, PublishChangesActionResponse> {
  private appId: string = "";
  private userId: string = "";

  /**
   * Define the validation schema for publish changes action
   */
  protected getValidationSchema() {
    return z.object({
      ids: z.array(z.string()).optional(),
    });
  }

  /**
   * Execute the publish changes action
   */
  async execute(data: PublishChangesActionData): Promise<PublishChangesActionResponse> {
    this.validateContext();
    this.appId = this.context!.appId;
    this.userId = this.context!.userId ?? "";

    try {
      const ids = data.ids ?? [];
      if (ids.length === 0) {
        throw new ActionError("IDS_REQUIRED", "At least one page ID or THEME must be provided");
      }

      const responses = await Promise.all(
        ids.map((id) => {
          if (id === "THEME") {
            return this.publishTheme();
          }
          return this.publishPage(id);
        }),
      );

      await this.clearChanges(ids);
      return { tags: uniq(flattenDeep(responses)) };
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
   * Publish theme changes
   */
  private async publishTheme(): Promise<string[]> {
    const app = await this.cloneApp();

    // Delete existing online app
    const { error: deleteError } = await safeQuery(() =>
      db.delete(schema.appsOnline).where(eq(schema.appsOnline.id, this.appId)),
    );

    if (deleteError) {
      throw new ActionError("Error deleting online theme", "ERROR_PUBLISHING_THEME", deleteError);
    }

    // Insert new online app
    const { error: insertError } = await safeQuery(() =>
      db.insert(schema.appsOnline).values({ ...app, changes: null }),
    );

    if (insertError) {
      throw new ActionError("Error inserting online theme", "ERROR_PUBLISHING_THEME", insertError);
    }

    // Update draft app to clear changes
    const { error: updateError } = await safeQuery(() =>
      db.update(schema.apps).set({ changes: null }).where(eq(schema.apps.id, this.appId)),
    );

    if (updateError) {
      throw new ActionError("Error updating theme", "ERROR_PUBLISHING_THEME", updateError);
    }

    return [`website-settings-${this.appId}`];
  }

  /**
   * Clone app data from main table
   */
  private async cloneApp(): Promise<AppData> {
    const { data, error } = await safeQuery(() =>
      db.query.apps.findFirst({
        where: eq(schema.apps.id, this.appId),
      }),
    );

    if (error || !data) {
      throw new ActionError("Site not found", "SITE_NOT_FOUND", error);
    }

    return data;
  }

  /**
   * Clear changes flag after publishing
   */
  private async clearChanges(ids: string[]): Promise<void> {
    // remove THEME from ids
    const pageIds = ids.filter((id) => id !== "THEME");

    if (pageIds.length === 0) {
      return;
    }

    const { error } = await safeQuery(() =>
      db
        .update(schema.appPages)
        .set({ changes: null, online: true })
        .where(and(inArray(schema.appPages.id, pageIds), eq(schema.appPages.app, this.appId))),
    );

    if (error) {
      throw new ActionError("Error clearing changes", "ERROR_CLEARING_CHANGES", error);
    }
  }

  /**
   * Get pages that use a partial block
   */
  private async getPartialBlockUsage(id: string): Promise<string[]> {
    const { data } = await safeQuery(() =>
      db.query.appPagesOnline.findMany({
        where: and(eq(schema.appPagesOnline.app, this.appId), like(schema.appPagesOnline.partialBlocks, `%${id}%`)),
        columns: {
          id: true,
        },
      }),
    );

    return uniq(data ?? [])
      .map((row: PartialPageIdOnly) => row.id)
      .map((page) => `page-${page}`);
  }

  /**
   * Publish a single page
   */
  private async publishPage(id: string): Promise<string[]> {
    const page = await this.clonePage(id);
    await this.addOnlinePage(page);

    const tags = [`page-${page.primaryPage ?? page.id}`];
    if (isEmpty(page.slug)) {
      tags.push(...(await this.getPartialBlockUsage(page.primaryPage ?? page.id)));
    }
    return tags;
  }

  /**
   * Create a revision before publishing
   */
  private async createRevision(pageId: string): Promise<boolean> {
    const { data: page, error } = await safeQuery(() =>
      db.query.appPagesOnline.findFirst({
        where: eq(schema.appPagesOnline.id, pageId),
      }),
    );

    if (error || !page || !isEmpty(page.primaryPage)) {
      // if the page has a primary page, we don't want to create a revision
      return false;
    }

    const { error: revisionError } = await safeQuery(() =>
      db.insert(schema.appPagesRevisions).values({
        ...page,
        type: "published",
        uid: undefined, // Let database generate new uid
      }),
    );

    if (revisionError) {
      throw new ActionError("Error creating revision", "ERROR_CREATING_REVISION", revisionError);
    }

    return true;
  }

  /**
   * Add page to online table
   */
  private async addOnlinePage(page: AppPageData): Promise<AddOnlinePageResult> {
    // Create revision and delete existing online page
    await this.createRevision(page.id);

    const { error: deleteError } = await safeQuery(() =>
      db.delete(schema.appPagesOnline).where(eq(schema.appPagesOnline.id, page.id)),
    );

    if (deleteError) {
      throw new ActionError("Error deleting online page", "ERROR_PUBLISHING_PAGE", deleteError);
    }

    // Destructure to remove fields that shouldn't be copied or are auto-generated
    const { changes, createdAt, ...pageData } = page;

    const { data, error } = await safeQuery(() =>
      db
        .insert(schema.appPagesOnline)
        .values({
          ...pageData,
          currentEditor: this.userId,
        })
        .returning({
          id: schema.appPagesOnline.id,
          primaryPage: schema.appPagesOnline.primaryPage,
        }),
    );

    if (error || !data || data.length === 0) {
      throw new ActionError("Error publishing page", "ERROR_PUBLISHING_PAGE", error);
    }

    return data[0];
  }

  /**
   * Clone page data from main table
   */
  private async clonePage(id: string): Promise<AppPageData> {
    const { data, error } = await safeQuery(() =>
      db.query.appPages.findFirst({
        where: and(eq(schema.appPages.id, id), eq(schema.appPages.app, this.appId)),
      }),
    );

    if (error || !data) {
      throw new ActionError("Page not found", "PAGE_NOT_FOUND", error);
    }

    return data;
  }

  /**
   * Handle execution errors with proper error transformation
   */
  private handleExecutionError(error: unknown): never {
    if (error instanceof ActionError) {
      throw error;
    }

    throw new ActionError(
      `Failed to publish changes: ${error instanceof Error ? error.message : "Unknown error"}`,
      "PUBLISH_CHANGES_FAILED",
    );
  }
}
