import { and, eq, like, or } from "drizzle-orm";
import { get, isEmpty, keys, omit, reverse, sortBy, take } from "lodash";
import { z } from "zod";
import { db, safeQuery, schema } from "../../../../server/db";
import { ActionError } from "./action-error";
import { BaseAction } from "./base-action";

/**
 * Data type for GetPageMetaAction
 */
type GetPageMetaActionData = {
  slug: string;
  draft: boolean;
  dynamicSegments?: Record<string, string>;
};

type GetPageMetaActionResponse = {
  id: string;
  slug: string;
  lang: string;
  name: string;
  pageType: string;
  languagePageId: string;
};

/**
 * Action to get page metadata by slug
 * Handles both static and dynamic pages
 */
export class GetPageMetaAction extends BaseAction<GetPageMetaActionData, GetPageMetaActionResponse> {
  /**
   * Define the validation schema for get page meta action
   */
  protected getValidationSchema() {
    return z.object({
      slug: z.string().nonempty(),
      draft: z.boolean(),
      dynamicSegments: z.record(z.string(), z.string()).optional(),
    });
  }

  /**
   * Execute the get page meta action
   */
  async execute(data: GetPageMetaActionData): Promise<GetPageMetaActionResponse> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
    const { appId } = this.context;

    // Determine which table to query based on draft flag
    const table = data.draft ? schema.appPages : schema.appPagesOnline;

    // First, try to find a direct slug match for non-dynamic pages
    const { data: directPageResult, error: directError } = await safeQuery(() =>
      db
        .select({
          id: table.id,
          slug: table.slug,
          lang: table.lang,
          primaryPage: table.primaryPage,
          name: table.name,
          pageType: table.pageType,
        })
        .from(table)
        .where(and(eq(table.slug, data.slug), eq(table.dynamic, false), eq(table.app, appId)))
        .limit(1),
    );

    if (directError) {
      throw new ActionError(`Database query failed: ${directError.message}`, "QUERY_FAILED");
    }

    if (directPageResult && directPageResult.length > 0) {
      const directPage = directPageResult[0];
      return omit(
        {
          ...directPage,
          id: directPage?.primaryPage ?? directPage?.id,
          languagePageId: directPage?.id,
        },
        ["primaryPage"],
      ) as GetPageMetaActionResponse;
    }

    // If no direct match, check for dynamic pages
    const dynamicPage = await this.findDynamicPage(data.slug, table, appId, data.dynamicSegments || {});

    if (dynamicPage) {
      return dynamicPage;
    }

    throw new ActionError("Page not found", "PAGE_NOT_FOUND");
  }

  /**
   * Find a dynamic page that matches the slug pattern
   */
  private async findDynamicPage(
    slug: string,
    table: typeof schema.appPages | typeof schema.appPagesOnline,
    appId: string,
    dynamicSegments: Record<string, string>,
  ): Promise<GetPageMetaActionResponse | null> {
    // Extract slug segments for pattern matching
    // slug: /blog/post-1, pick /blog/ or if /en/blog/post-1/ then pick /en/blog/
    const strippedSlug = slug.slice(1);
    const segment1 = `/${take(strippedSlug.split("/"), 1).join("/")}`;
    const segment2 = `/${take(strippedSlug.split("/"), 2).join("/")}`;

    // Get all dynamic pages that might match
    const { data: pages, error: pagesError } = await safeQuery(() =>
      db
        .select({
          id: table.id,
          slug: table.slug,
          lang: table.lang,
          primaryPage: table.primaryPage,
          name: table.name,
          pageType: table.pageType,
          dynamicSlugCustom: table.dynamicSlugCustom,
        })
        .from(table)
        .where(
          and(
            or(like(table.slug, `%${segment1}%`), like(table.slug, `%${segment2}%`)),
            eq(table.dynamic, true),
            eq(table.app, appId),
          ),
        ),
    );

    if (pagesError) {
      throw new ActionError(`Database query failed: ${pagesError.message}`, "QUERY_FAILED");
    }

    if (!pages || pages.length === 0) {
      return null;
    }

    // Sort pages by slug depth (longer slugs first)
    const sortedPages = reverse(sortBy(pages, (page) => page.slug.split("/").length));

    // Sort by dynamic segments priority if provided
    const dynamicKeys = keys(dynamicSegments);
    if (dynamicKeys.length > 0) {
      sortedPages.sort((a, b) => {
        const aIndex = dynamicKeys.indexOf(a.pageType || "");
        const bIndex = dynamicKeys.indexOf(b.pageType || "");
        const aOrder = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
        const bOrder = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
        return aOrder - bOrder;
      });
    }

    // Find the first page that matches the slug pattern
    for (const page of sortedPages) {
      if (isEmpty(page.slug)) {
        continue;
      }

      const pageType = page.pageType || "";
      const regex = get(dynamicSegments, pageType, "");
      const pattern = page.slug + regex + page.dynamicSlugCustom;
      const reg = new RegExp(pattern);
      const match = slug.match(reg);

      if (match && match[0] === slug) {
        return omit(
          {
            ...page,
            slug,
            id: page?.primaryPage ?? page?.id,
            languagePageId: page?.id,
          },
          ["primaryPage", "dynamicSlugCustom"],
        ) as GetPageMetaActionResponse;
      }
    }

    return null;
  }
}
