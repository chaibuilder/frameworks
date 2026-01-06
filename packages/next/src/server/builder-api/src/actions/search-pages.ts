import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { db, safeQuery, schema } from "../../../db";
import { ActionError } from "./action-error";
import { BaseAction } from "./base-action";

/**
 * Data type for SearchPagesAction
 */
type SearchPagesActionData = {
  pageType: string;
  query?: string;
};

type SearchPagesActionResponse = Array<{
  id: string;
  slug: string;
  name: string;
}>;

/**
 * Action to search pages by type and query
 */
export class SearchPagesAction extends BaseAction<SearchPagesActionData, SearchPagesActionResponse> {
  /**
   * Define the validation schema for search pages action
   */
  protected getValidationSchema() {
    return z.object({
      pageType: z.string().min(1),
      query: z.string().optional(),
    });
  }

  /**
   * Execute the search pages action
   */
  async execute(data: SearchPagesActionData): Promise<SearchPagesActionResponse> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
    const { appId } = this.context;
    const { pageType, query = "" } = data;

    // Check if query is a UUID (length 36)
    const isUuid = this.isUUID(query);

    // Build the where conditions
    const baseConditions = [
      eq(schema.appPages.app, appId),
      isNull(schema.appPages.primaryPage),
      eq(schema.appPages.pageType, pageType),
    ];

    // Add query conditions if provided
    let whereCondition;
    if (query) {
      if (isUuid) {
        // If UUID, search by exact ID match
        whereCondition = and(...baseConditions, eq(schema.appPages.id, query));
      } else {
        // Otherwise, search by slug or name using case-insensitive LIKE
        whereCondition = and(
          ...baseConditions,
          or(ilike(schema.appPages.slug, `%${query}%`), ilike(schema.appPages.name, `%${query}%`)),
        );
      }
    } else {
      whereCondition = and(...baseConditions);
    }

    // Execute the query using safeQuery
    const { data: pages, error } = await safeQuery(() =>
      db
        .select({
          id: schema.appPages.id,
          slug: schema.appPages.slug,
          name: schema.appPages.name,
        })
        .from(schema.appPages)
        .where(whereCondition),
    );

    if (error) {
      throw new ActionError("Failed to search pages", "ERROR_SEARCHING_PAGES", error);
    }

    return pages || [];
  }

  /**
   * Check if a string is a UUID (length 36)
   */
  private isUUID(query: string): boolean {
    return query.length === 36;
  }
}
