import { ChaiBlock } from "@chaibuilder/sdk";
import { SupabaseClient } from "@supabase/supabase-js";
import { compact, flattenDeep, get, isEmpty, omit, startsWith, uniq } from "lodash";
import {
  CHAI_APPS_ONLINE_TABLE_NAME,
  CHAI_APPS_TABLE_NAME,
  CHAI_ONLINE_PAGES_TABLE_NAME,
  CHAI_PAGES_REVISIONS_TABLE_NAME,
  CHAI_PAGES_TABLE_NAME,
} from "./CONSTANTS";
import { apiError } from "./lib";

class ChaiBuilderPublishChanges {
  constructor(
    private supabase: SupabaseClient,
    private appUuid: string,
    private chaiUser: string,
  ) {}

  async publishChanges(ids: string[] = []) {
    if (ids.length === 0) {
      throw apiError("IDS_REQUIRED", new Error("IDS_REQUIRED"));
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
  }

  async publishTheme() {
    const app = await this.cloneApp();
    const { error } = await this.supabase.from(CHAI_APPS_ONLINE_TABLE_NAME).delete().eq("id", this.appUuid);

    if (error) {
      throw apiError("ERROR_PUBLISHING_THEME", error);
    }

    const { error: insertError } = await this.supabase
      .from(CHAI_APPS_ONLINE_TABLE_NAME)
      .insert({ ...app, changes: null });

    if (insertError) {
      throw apiError("ERROR_PUBLISHING_THEME", insertError);
    }

    const { error: updateError } = await this.supabase
      .from(CHAI_APPS_TABLE_NAME)
      .update({ changes: null })
      .eq("id", this.appUuid);

    if (updateError) {
      throw apiError("ERROR_PUBLISHING_THEME", updateError);
    }

    return [`website-settings-${this.appUuid}`];
  }
  async cloneApp() {
    const { data, error } = await this.supabase.from(CHAI_APPS_TABLE_NAME).select("*").eq("id", this.appUuid).single();

    if (error) {
      throw apiError("SITE_NOT_FOUND", error);
    }

    return data;
  }

  async clearChanges(ids: string[]) {
    // remove THEME from ids
    ids = ids.filter((id) => id !== "THEME");
    await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .update({ changes: null, online: true })
      .in("id", ids)
      .eq("app", this.appUuid);
  }

  async getPartialBlockUsage(id: string) {
    const { data } = await this.supabase
      .from(CHAI_ONLINE_PAGES_TABLE_NAME)
      .select("id")
      .eq("app", this.appUuid)
      .like("partialBlocks", `%${id}%`);

    return uniq(data ?? [])
      .map((row: any) => row.id)
      .map((page) => `page-${page}`);
  }

  async publishPage(id: string) {
    const page = await this.clonePage(id);
    const partialBlocks = this.getPartialBlocks(page.blocks);
    const links = this.getLinks(page.blocks);
    await this.addOnlinePage(page, partialBlocks, links);

    const tags = [`page-${page.primaryPage ?? page.id}`];
    if (isEmpty(page.slug)) {
      tags.push(...(await this.getPartialBlockUsage(page.primaryPage ?? page.id)));
    }
    console.log("Tags: ", tags);
    return tags;
  }

  async createRevision(pageId: string) {
    const { data: page, error } = await this.supabase
      .from(CHAI_ONLINE_PAGES_TABLE_NAME)
      .select("*")
      .eq("id", pageId)
      .single();

    if (error || !isEmpty(page.primaryPage)) {
      // if the page has a primary page, we don't want to create a revision
      return false;
    }

    const { error: revisionError } = await this.supabase.from(CHAI_PAGES_REVISIONS_TABLE_NAME).insert({
      ...page,
      type: "published",
    });

    if (revisionError) {
      throw apiError("ERROR_CREATING_REVISION", revisionError);
    }

    return true;
  }

  async addOnlinePage(page: any, partialBlocks: string, links: string) {
    //delete all pages from the online table with the same page id
    await this.createRevision(page.id);
    await this.supabase.from(CHAI_ONLINE_PAGES_TABLE_NAME).delete().eq("id", page.id);

    const { data, error } = await this.supabase
      .from(CHAI_ONLINE_PAGES_TABLE_NAME)
      .insert({
        ...omit(page, ["changes"]),
        partialBlocks,
        links,
        createdAt: "now()",
        currentEditor: this.chaiUser,
      })
      .select("id,primaryPage")
      .single();

    if (error) {
      throw apiError("ERROR_PUBLISHING_PAGE", error);
    }

    return data;
  }

  getPartialBlocks(blocks: ChaiBlock[]) {
    return compact(
      blocks
        .filter((block) => block._type === "GlobalBlock" || block._type === "PartialBlock")
        .map((block) => get(block, "partialBlockId", get(block, "globalBlock", false))),
    ).join("|");
  }

  getLinks(blocks: ChaiBlock[]) {
    return compact(
      blocks
        .filter((block) => block._type === "Link" && get(block, "link.type", false) === "pageType")
        .map((block) => {
          const href = get(block, "link.href", "");
          if (startsWith(href, "pageType:")) return get(href.split(":"), "2", "");
          return "";
        }),
    ).join("|");
  }

  async clonePage(id: string) {
    const { data, error } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select("*")
      .eq("id", id)
      .eq("app", this.appUuid)
      .single();

    if (error) {
      throw apiError("PAGE_NOT_FOUND", error);
    }

    return data;
  }
}

export default ChaiBuilderPublishChanges;
