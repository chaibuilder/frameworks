import { and, eq, inArray, like } from "drizzle-orm";
import { flattenDeep, isEmpty, omit, uniq } from "lodash";
import { z } from "zod";
import { db, safeQuery, schema } from "../../../db";
import { ActionError } from "./action-error";
import { BaseAction } from "./base-action";

/**
 * Data type for PublishPageAction
 */
type PublishPageActionData = {
  ids: string[];
};

type PublishPageActionResponse = {
  tags: string[];
};

/**
 * Action to publish pages and themes
 */
export class PublishPageAction extends BaseAction<PublishPageActionData, PublishPageActionResponse> {
  private appUuid: string = "";
  private chaiUser: string = "";

  /**
   * Define the validation schema for publish page action
   */
  protected getValidationSchema() {
    return z.object({
      ids: z.array(z.string()).min(1),
    });
  }

  /**
   * Execute the publish page action
   */
  async execute(data: PublishPageActionData): Promise<PublishPageActionResponse> {
    try {
      this.validate(data);
      const validationErrors = this.getValidationErrors(data);
      if (validationErrors) {
        throw new ActionError(validationErrors, "VALIDATION_ERROR");
      }
      this.validateContext();
      this.appUuid = this.context!.appId;
      this.chaiUser = this.context!.userId || "unknown";

      const { ids } = data;

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
      if (error instanceof z.ZodError) {
        throw new ActionError("Validation failed", "VALIDATION_ERROR");
      }
      throw error;
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
   * Publish the theme
   */
  async publishTheme(): Promise<string[]> {
    const app = await this.cloneApp();

    try {
      await db.transaction(async (tx) => {
        // Delete existing online app
        await tx.delete(schema.appsOnline).where(eq(schema.appsOnline.id, this.appUuid));

        // Insert new online app
        await tx.insert(schema.appsOnline).values({ ...app, changes: null });

        // Update app changes to null
        await tx
          .update(schema.apps)
          .set({ changes: null })
          .where(eq(schema.apps.id, this.appUuid));
      });
    } catch (error) {
      throw new ActionError(
        `Error publishing theme: ${error instanceof Error ? error.message : "Unknown error"}`,
        "ERROR_PUBLISHING_THEME",
      );
    }

    return [`website-settings-${this.appUuid}`];
  }

  /**
   * Clone the app
   */
  async cloneApp() {
    const { data, error } = await safeQuery(() =>
      db.query.apps.findFirst({
        where: eq(schema.apps.id, this.appUuid),
      })
    );

    if (error) {
      throw new ActionError(`Site not found: ${error.message}`, "SITE_NOT_FOUND");
    }

    if (!data) {
      throw new ActionError("Site not found", "SITE_NOT_FOUND");
    }

    return data;
  }

  /**
   * Clear changes for the published ids
   */
  async clearChanges(ids: string[]) {
    // remove THEME from ids
    const pageIds = ids.filter((id) => id !== "THEME");

    if (pageIds.length === 0) {
      return;
    }

    await safeQuery(() =>
      db.update(schema.appPages)
        .set({ changes: null, online: true })
        .where(and(inArray(schema.appPages.id, pageIds), eq(schema.appPages.app, this.appUuid)))
    );
  }

  /**
   * Get partial block usage
   */
  async getPartialBlockUsage(id: string) {
    const { data } = await safeQuery(() =>
      db.query.appPagesOnline.findMany({
        where: and(
          eq(schema.appPagesOnline.app, this.appUuid),
          like(schema.appPagesOnline.partialBlocks, `%${id}%`)
        ),
        columns: {
          id: true,
        },
      })
    );

    return uniq(data ?? [])
      .map((row) => row.id)
      .map((page) => `page-${page}`);
  }

  /**
   * Publish a page
   */
  async publishPage(id: string): Promise<string[]> {
    const page = await this.clonePage(id);
    await this.addOnlinePage(page);

    const tags = [`page-${page.primaryPage ?? page.id}`];
    if (isEmpty(page.slug)) {
      tags.push(...(await this.getPartialBlockUsage(page.primaryPage ?? page.id)));
    }
    return tags;
  }

  /**
   * Create a revision of a page
   */
  async createRevision(pageId: string) {
    const { data: page, error } = await safeQuery(() =>
      db.query.appPagesOnline.findFirst({
        where: eq(schema.appPagesOnline.id, pageId),
      })
    );

    if (error || !page || !isEmpty(page.primaryPage)) {
      // if the page has a primary page, we don't want to create a revision
      return false;
    }

    const { error: revisionError } = await safeQuery(() =>
      db.insert(schema.appPagesRevisions).values({
        ...page,
        type: "published",
      })
    );

    if (revisionError) {
      throw new ActionError(`Error creating revision: ${revisionError.message}`, "ERROR_CREATING_REVISION");
    }

    return true;
  }

  /**
   * Add a page to the online pages table
   */
  async addOnlinePage(page: any) {
    //delete all pages from the online table with the same page id
    await this.createRevision(page.id);

    try {
      const [publishedPage] = await db.transaction(async (tx) => {
        await tx.delete(schema.appPagesOnline).where(eq(schema.appPagesOnline.id, page.id));

        return await tx
          .insert(schema.appPagesOnline)
          .values({
            ...omit(page, ["changes"]),
            createdAt: new Date().toISOString(),
            currentEditor: this.chaiUser,
          })
          .returning({ id: schema.appPagesOnline.id, primaryPage: schema.appPagesOnline.primaryPage });
      });

      if (!publishedPage) {
        throw new Error("Failed to return published page data");
      }

      return publishedPage;
    } catch (error) {
      throw new ActionError(
        `Error publishing page: ${error instanceof Error ? error.message : "Unknown error"}`,
        "ERROR_PUBLISHING_PAGE",
      );
    }
  }

  /**
   * Clone a page
   */
  async clonePage(id: string) {
    const { data, error } = await safeQuery(() =>
      db.query.appPages.findFirst({
        where: and(eq(schema.appPages.id, id), eq(schema.appPages.app, this.appUuid)),
      })
    );

    if (error) {
      throw new ActionError(`Page not found: ${error.message}`, "PAGE_NOT_FOUND");
    }

    if (!data) {
        throw new ActionError("Page not found", "PAGE_NOT_FOUND");
    }

    return data;
  }
}
