import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../../../db";
import { ActionError } from "./action-error";
import { BaseAction } from "./base-action";

/**
 * Data type for DuplicatePageAction
 */
type DuplicatePageActionData = {
  pageId: string;
  name: string;
  slug?: string;
};

type DuplicatePageActionResponse = {
  id: string;
};

/**
 * Action to duplicate a page
 */
export class DuplicatePageAction extends BaseAction<DuplicatePageActionData, DuplicatePageActionResponse> {
  /**
   * Define the validation schema for duplicate page action
   */
  protected getValidationSchema() {
    return z.object({
      pageId: z.string().nonempty(),
      name: z.string().nonempty(),
      slug: z.string().optional(),
    });
  }

  /**
   * Execute the duplicate page action
   */
  async execute(data: DuplicatePageActionData): Promise<DuplicatePageActionResponse> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }

    try {
      // Parallel execution: Check slug uniqueness and fetch original page simultaneously
      const [slugExists, originalPage] = await Promise.all([
        data.slug ? this.doesSlugExist(data.slug) : Promise.resolve(false),
        db.query.appPages.findFirst({
          where: and(eq(schema.appPages.id, data.pageId), eq(schema.appPages.app, this.context.appId)),
        }),
      ]);

      // Validate slug uniqueness if provided
      if (data.slug && slugExists) {
        throw new ActionError("Slug already exists", "SLUG_EXISTS");
      }

      // Validate original page exists
      if (!originalPage) {
        throw new ActionError("Page not found", "PAGE_NOT_FOUND");
      }

      // Create duplicated page with optimized insert
      const { id, createdAt, ...pageData } = originalPage;
      const duplicatedPageData = {
        ...pageData,
        name: data.name,
        currentEditor: null,
        changes: null,
        online: false,
        libRefId: null,
        lastSaved: null,
        ...(data.slug && { slug: data.slug }),
      };

      const [result] = await db
        .insert(schema.appPages)
        .values(duplicatedPageData)
        .returning({ id: schema.appPages.id });

      if (!result) {
        throw new ActionError("Failed to create duplicate page", "INSERT_FAILED");
      }

      return { id: result.id };
    } catch (error) {
      throw error;
    }
  }

  private async doesSlugExist(slug: string): Promise<boolean> {
    if (!this.context?.appId) {
      return false;
    }
    try {
      const existingPage = await db.query.appPages.findFirst({
        where: and(eq(schema.appPages.slug, slug), eq(schema.appPages.app, this.context.appId)),
        columns: {
          id: true,
        },
      });

      return !!existingPage;
    } catch (error) {
      return false;
    }
  }
}
