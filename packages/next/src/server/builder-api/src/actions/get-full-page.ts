import { ChaiBlock } from "@chaibuilder/sdk";
import { differenceInMinutes } from "date-fns";
import { and, eq, inArray, sql } from "drizzle-orm";
import { get, has, isEmpty } from "lodash";
import { z } from "zod";
import { db, safeQuery, schema } from "../../../../server/db";
import { ActionError } from "./action-error";
import { BaseAction } from "./base-action";

/**
 * Data type for GetFullPageAction
 */
type GetFullPageActionData = {
  id: string;
  draft: boolean;
  mergeGlobal?: boolean;
  mergePartials?: boolean;
  editor?: boolean;
};

type GetFullPageActionResponse = {
  id: string;
  name: string;
  slug: string;
  lang: string;
  primaryPage?: string | null;
  seo: any;
  currentEditor?: string | null;
  pageType?: string | null;
  lastSaved?: string | null;
  tracking: any;
  dynamic: boolean | null;
  parent?: string | null;
  blocks: ChaiBlock[];
  languagePageId: string;
};

/**
 * Action to get full page data including blocks
 * Handles editor locking and partial block merging
 */
export class GetFullPageAction extends BaseAction<GetFullPageActionData, GetFullPageActionResponse> {
  /**
   * Define the validation schema for get full page action
   */
  protected getValidationSchema() {
    return z.object({
      id: z.string().nonempty(),
      draft: z.boolean(),
      mergeGlobal: z.boolean().optional(),
      mergePartials: z.boolean().optional(),
      editor: z.boolean().optional(),
    });
  }

  /**
   * Execute the get full page action
   */
  async execute(data: GetFullPageActionData): Promise<GetFullPageActionResponse> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
    const { appId, userId } = this.context;

    // Determine which table to query based on draft flag
    const table = data.draft ? schema.appPages : schema.appPagesOnline;

    // Get page data
    const { data: pageResult, error } = await safeQuery(() =>
      db
        .select({
          id: table.id,
          name: table.name,
          slug: table.slug,
          lang: table.lang,
          primaryPage: table.primaryPage,
          seo: table.seo,
          currentEditor: table.currentEditor,
          pageType: table.pageType,
          lastSaved: table.lastSaved,
          tracking: table.tracking,
          dynamic: table.dynamic,
          parent: table.parent,
        })
        .from(table)
        .where(and(eq(table.app, appId), eq(table.id, data.id)))
        .limit(1),
    );

    if (error || !pageResult || pageResult.length === 0) {
      throw new ActionError("Page not found", "PAGE_NOT_FOUND");
    }

    const page = pageResult[0];
    if (!page) {
      throw new ActionError("Page data is invalid", "INVALID_PAGE_DATA");
    }
    const primaryPageId = page.primaryPage ?? page.id;

    // Get blocks from the primary page
    const { data: blocksResult, error: blocksError } = await safeQuery(() =>
      db
        .select({
          blocks: table.blocks,
        })
        .from(table)
        .where(and(eq(table.app, appId), eq(table.id, primaryPageId)))
        .limit(1),
    );

    if (blocksError) {
      throw new ActionError("Failed to fetch page blocks", "BLOCKS_NOT_FOUND");
    }

    let blocks = (blocksResult?.[0]?.blocks as ChaiBlock[]) ?? [];

    // Merge partials if requested
    const shouldMergePartials = data.mergeGlobal ?? data.mergePartials ?? false;
    if (shouldMergePartials) {
      blocks = await this.getMergedBlocks(blocks, data.draft, appId);
    }

    // Handle editor locking for draft pages
    let currentEditor = page.currentEditor;

    if (data.draft && data.editor) {
      if (!userId) {
        throw new ActionError("User ID is required for editor locking", "USER_ID_REQUIRED");
      }
      const lockResult = await this.handleEditorLock(page, primaryPageId, userId, appId);
      currentEditor = lockResult.currentEditor;
    }

    return {
      id: data.id,
      name: page.name,
      slug: page.slug,
      lang: page.lang,
      primaryPage: page.primaryPage,
      seo: page.seo,
      currentEditor,
      pageType: page.pageType,
      lastSaved: page.lastSaved,
      tracking: page.tracking,
      dynamic: page.dynamic,
      parent: page.parent,
      blocks,
      languagePageId: page.id,
    };
  }

  /**
   * Handle editor locking logic
   */
  private async handleEditorLock(
    page: any,
    primaryPageId: string,
    userId: string,
    appId: string,
  ): Promise<{ currentEditor: string | null }> {
    const now = new Date();
    let canTakePage = false;

    // Check if we can take over the page (no editor or last save > 5 minutes ago)
    if (page.lastSaved) {
      const lastSaved = new Date(page.lastSaved);
      canTakePage = differenceInMinutes(now, lastSaved) > 5;
    }

    const isCurrentEditorNull = page.currentEditor === null;

    if (isCurrentEditorNull || canTakePage) {
      // Take over the page
      await safeQuery(() =>
        db
          .update(schema.appPages)
          .set({
            currentEditor: userId,
            lastSaved: sql`now()`,
          })
          .where(and(eq(schema.appPages.id, primaryPageId), eq(schema.appPages.app, appId))),
      );
      return { currentEditor: userId };
    } else if (page.currentEditor === userId) {
      // Update last saved time for current editor
      await safeQuery(() =>
        db
          .update(schema.appPages)
          .set({
            lastSaved: sql`now()`,
          })
          .where(and(eq(schema.appPages.id, primaryPageId), eq(schema.appPages.app, appId))),
      );
      return { currentEditor: userId };
    }

    return { currentEditor: page.currentEditor };
  }

  /**
   * Merge partial blocks into the main blocks array
   * Optimized to fetch all partial blocks in a single query
   */
  private async getMergedBlocks(blocks: ChaiBlock[], draft: boolean, appId: string): Promise<ChaiBlock[]> {
    const table = draft ? schema.appPages : schema.appPagesOnline;
    const partialBlocksList = blocks.filter(({ _type }) => _type === "GlobalBlock" || _type === "PartialBlock");

    if (partialBlocksList.length === 0) {
      return blocks;
    }

    // Collect all partial block IDs
    const partialBlockIds = partialBlocksList
      .map((partialBlock) => get(partialBlock, "partialBlockId", get(partialBlock, "globalBlock", "")))
      .filter((id) => id !== "");

    if (partialBlockIds.length === 0) {
      return blocks;
    }

    // Fetch all partial blocks in ONE query
    const { data: partialResults } = await safeQuery(() =>
      db
        .select({
          id: table.id,
          blocks: table.blocks,
        })
        .from(table)
        .where(and(eq(table.app, appId), inArray(table.id, partialBlockIds))),
    );

    // Create a map for quick lookup: { partialBlockId: blocks[] }
    const partialBlocksMap = new Map<string, ChaiBlock[]>();
    if (partialResults) {
      partialResults.forEach((result) => {
        partialBlocksMap.set(result.id, (result.blocks as ChaiBlock[]) ?? []);
      });
    }

    // Replace partial blocks with their actual content
    for (let i = 0; i < partialBlocksList.length; i++) {
      const partialBlock = partialBlocksList[i];
      if (!partialBlock) continue;

      const partialBlockId = get(partialBlock, "partialBlockId", get(partialBlock, "globalBlock", ""));
      if (partialBlockId === "") continue;

      let partialBlocks = partialBlocksMap.get(partialBlockId) ?? [];

      // Inherit parent properties
      if (partialBlocks.length > 0) {
        partialBlocks = partialBlocks.map((block) => {
          if (isEmpty(block._parent)) block._parent = partialBlock._parent;
          if (has(partialBlock, "_show")) block._show = partialBlock._show;
          return block;
        });
      }

      // Replace the reference with actual content
      const index = blocks.indexOf(partialBlock);
      if (index !== -1) {
        blocks.splice(index, 1, ...partialBlocks);
      }
    }

    return blocks;
  }
}
