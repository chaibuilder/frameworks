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

  async restoreRevision(args: { revisionId: string; discardCurrent: boolean }) {
    //
    const { data: revision, error: revisionError } = await this.supabase
      .from(CHAI_PAGES_REVISIONS_TABLE_NAME)
      .select("id, blocks, type")
      .eq("app", this.appUuid)
      .eq("uid", args.revisionId)
      .single();

    if (revisionError) {
      throw apiError("ERROR_RESTORING_REVISION", revisionError);
    }

    const pageId = revision.id;
    const blocks = revision.blocks;

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
