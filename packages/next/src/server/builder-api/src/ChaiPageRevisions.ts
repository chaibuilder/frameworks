import { SupabaseClient } from "@supabase/supabase-js";
import { pick, sortBy } from "lodash";
import {
  CHAI_ONLINE_PAGES_TABLE_NAME,
  CHAI_PAGES_REVISIONS_TABLE_NAME,
  CHAI_PAGES_TABLE_NAME,
} from "./CONSTANTS";
import { apiError } from "./lib";
class ChaiPageRevisions {
  constructor(
    private supabase: SupabaseClient,
    private appUuid: string,
    private chaiUser: string
  ) {}

  async getRevisions(args: { pageId: string }) {
    // first get record from app_pages_online table
    const { data, error } = await this.supabase
      .from(CHAI_ONLINE_PAGES_TABLE_NAME)
      .select("currentEditor, createdAt")
      .eq("app", this.appUuid)
      .eq("id", args.pageId);

    // get all records from app_pages_revisions table
    const { data: revisions, error: revisionsError } = await this.supabase
      .from(CHAI_PAGES_REVISIONS_TABLE_NAME)
      .select("uid, currentEditor, createdAt, type")
      .eq("app", this.appUuid)
      .eq("id", args.pageId);

    const currentPage = (data ?? []).map((page) => ({
      ...page,
      type: "published",
      uid: "current",
    }));
    // merge the two arrays
    const merged = [...currentPage, ...(revisions ?? [])];

    return sortBy(merged, "createdAt").reverse();
  }

  async deleteRevision(args: { revisionId: string }) {
    await this.supabase
      .from(CHAI_PAGES_REVISIONS_TABLE_NAME)
      .delete()
      .eq("uid", args.revisionId);

    return { success: true };
  }

  async restoreRevision(args: { revisionId: string; discardCurrent: boolean; pageId?: string }) {
    let pageId: string;
    let blocks: any;

    // Handle special case when revisionId is "current" (live page)
    if (args.revisionId === "current") {
      // Fetch from app_pages_online table for live revision
      if (!args.pageId) {
        throw apiError("ERROR_RESTORING_REVISION", new Error("pageId is required when restoring current revision"));
      }

      const { data: onlinePage, error: onlinePageError } = await this.supabase
        .from(CHAI_ONLINE_PAGES_TABLE_NAME)
        .select("id, blocks")
        .eq("app", this.appUuid)
        .eq("id", args.pageId)
        .single();

      if (onlinePageError || !onlinePage) {
        throw apiError("ERROR_RESTORING_REVISION", onlinePageError || new Error("Live page not found"));
      }

      pageId = onlinePage.id;
      blocks = onlinePage.blocks;
    } else {
      // Fetch from app_pages_revisions table for regular revisions
      const { data: revision, error: revisionError } = await this.supabase
        .from(CHAI_PAGES_REVISIONS_TABLE_NAME)
        .select("id, blocks, type")
        .eq("app", this.appUuid)
        .eq("uid", args.revisionId)
        .single();

      if (revisionError) {
        throw apiError("ERROR_RESTORING_REVISION", revisionError);
      }

      pageId = revision.id;
      blocks = revision.blocks;
    }

    if (!args.discardCurrent) {
      const { data: currentPage, error: currentPageError } = await this.supabase
        .from(CHAI_PAGES_TABLE_NAME)
        .select("*")
        .eq("id", pageId)
        .single();

      if (currentPageError) {
        throw apiError("ERROR_RESTORING_REVISION", currentPageError);
      }

      const currentPageBlocks = currentPage?.blocks;

      // create a new draft revision
      await this.supabase.from(CHAI_PAGES_REVISIONS_TABLE_NAME).insert({
        id: pageId,
        blocks: currentPageBlocks,
        type: "draft",
        createdAt: "now()",
        ...pick(currentPage, [
          "name",
          "slug",
          "pageType",
          "lang",
          "app",
          "currentEditor",
        ]),
      });
    }
    // update the current page with the new blocks
    await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .update({ blocks })
      .eq("id", pageId);

    return { success: true };
  }

  async deleteRevisions(args: { id: string }) {
    await this.supabase
      .from(CHAI_PAGES_REVISIONS_TABLE_NAME)
      .delete()
      .eq("id", args.id);

    return { success: true };
  }
}
export { ChaiPageRevisions };
