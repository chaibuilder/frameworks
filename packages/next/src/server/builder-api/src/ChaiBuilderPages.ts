import { SupabaseClient } from "@supabase/supabase-js";
import { differenceInMinutes } from "date-fns";
import {
  find,
  get,
  has,
  isEmpty,
  keys,
  omit,
  pick,
  reverse,
  sortBy,
  take,
} from "lodash";
import {
  CHAI_APPS_TABLE_NAME,
  CHAI_ONLINE_PAGES_TABLE_NAME,
  CHAI_PAGES_METADATA_TABLE_NAME,
  CHAI_PAGES_TABLE_NAME,
} from "./CONSTANTS";
import { UpdatePageBody } from "./types";

import { ChaiBlock } from "@chaibuilder/sdk";
import { ChaiBuilderLibraries } from "./ChaiBuilderLibraries";
import { ChaiBuilderPageBlocks } from "./ChaiBuilderPageBlocks";
import { ChaiPageRevisions } from "./ChaiPageRevisions";
import { apiError, getTemplate } from "./lib";
export class ChaiBuilderPages {
  private pageBlocks: ChaiBuilderPageBlocks;
  private chaiLibraries: ChaiBuilderLibraries;
  private revisions: ChaiPageRevisions;

  constructor(
    private supabase: SupabaseClient,
    private appUuid: string,
    private chaiUser: string
  ) {
    this.pageBlocks = new ChaiBuilderPageBlocks(supabase, appUuid);
    this.chaiLibraries = new ChaiBuilderLibraries(supabase, appUuid, chaiUser);
    this.revisions = new ChaiPageRevisions(supabase, appUuid, chaiUser);
  }

  async getPageByMeta(args: { columns: string; searchText: string }) {
    // Create a query builder
    let query = this.supabase
      .from(CHAI_PAGES_METADATA_TABLE_NAME)
      .select("pageId, slug, pageType, publishedAt")
      .eq("app", this.appUuid);

    // Split the columns string into an array of column names
    const searchColumns = args.columns.split(",").map((col) => col.trim());

    // Build OR conditions for each column
    if (searchColumns.length > 0) {
      const orConditions = searchColumns
        .map((column) => `${column}.ilike.%${args.searchText}%`)
        .join(",");

      query = query.or(orConditions);
    } else {
      // Default to pageContent if no columns specified
      query = query.ilike("pageContent", `%${args.searchText}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw apiError("ERROR_GETTING_PAGE_BY_META", error);
    }
    return data;
  }

  async upsertPageMeta(args: {
    pageId: string;
    slug: string;
    pageType: string;
    pageBlocks: string;
    dataProviders?: string;
    pageContent?: string;
    dataBindings?: string;
  }) {
    // First check if the record exists
    const { data: existingRecord } = await this.supabase
      .from(CHAI_PAGES_METADATA_TABLE_NAME)
      .select("id")
      .eq("slug", args.slug)
      .eq("app", this.appUuid)
      .maybeSingle();

    let result;

    if (existingRecord) {
      // Update existing record
      result = await this.supabase
        .from(CHAI_PAGES_METADATA_TABLE_NAME)
        .update({ ...args, app: this.appUuid, publishedAt: "now()" })
        .eq("slug", args.slug)
        .eq("app", this.appUuid);
    } else {
      // Insert new record
      result = await this.supabase
        .from(CHAI_PAGES_METADATA_TABLE_NAME)
        .insert({ ...args, app: this.appUuid, publishedAt: "now()" });
    }

    if (result.error) {
      throw apiError("ERROR_UPSERTING_PAGE_META", result.error);
    }

    return { success: true };
  }

  async releaseLock(id: string, user: string) {
    const { data, error } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .update({ currentEditor: null })
      .or(`id.eq.${id},currentEditor.eq.${user}`)
      .eq("app", this.appUuid);

    if (error) {
      console.log(error);
      throw apiError("ERROR_RELEASE_LOCK", error);
    }
    return { success: true };
  }

  async getPageById(id: string) {
    const { data, error } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select("id,slug,lang,pageType,name,primaryPage,online")
      .eq("id", id)
      .eq("app", this.appUuid)
      .single();

    if (error) {
      throw apiError("ERROR_GETTING_PAGE", error);
    }
    return data;
  }

  async changeSlug(id: string, slug: string) {
    const page = await this.getPageById(id);
    const lang = page.lang;

    if (await this.exists(slug, lang)) {
      throw apiError("SLUG_ALREADY_USED", new Error("SLUG_ALREADY_USED"));
    }

    const { error } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .update({ slug, changes: ["Updated"] })
      .eq("id", id)
      .eq("app", this.appUuid);

    if (error) {
      throw apiError("ERROR_CHANGING_SLUG", error);
    }

    return { page: { ...page, slug } };
  }

  async getPages(pageType: string) {
    const { data, error } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select("id, slug, lang, pageType, name, currentEditor")
      .eq("app", this.appUuid)
      .eq("pageType", pageType)
      .is("primaryPage", null);

    if (error) {
      throw apiError("ERROR_GETTING_PAGES", error);
    }
    return data;
  }

  async deleteOnlinePage(id: string) {
    await this.supabase
      .from(CHAI_ONLINE_PAGES_TABLE_NAME)
      .delete()
      .eq("id", id);

    await this.supabase
      .from(CHAI_ONLINE_PAGES_TABLE_NAME)
      .delete()
      .eq("primaryPage", id);
  }

  async takeOffline(id: string) {
    //TODO: Delete page from online table
    const pageType = await this.getPageType(id);
    const { error } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .update({ online: false })
      .or(`id.eq.${id}`)
      .eq("app", this.appUuid);

    await this.deleteOnlinePage(id);

    if (error) {
      throw apiError("ERROR_TAKING_PAGE_OFFLINE", error);
    }
    if (pageType === "language") {
      const primaryPage = await this.getPrimaryPage(id);
      return { tags: [`page-${primaryPage}`] };
    }
    if (pageType === "partial") {
      const pagesUsingPartial = await this.pageBlocks.getPartialBlockUsage(id);
      return { tags: [...pagesUsingPartial.map((page) => `page-${page}`)] };
    }

    const { data: page, error: pageError } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select("id, slug, lang, pageType, name, online, seo")
      .eq("id", id)
      .single();
    if (pageError) {
      throw apiError("ERROR_TAKING_PAGE_OFFLINE", pageError);
    }
    return { tags: [`page-${id}`], page };
  }

  async getChanges() {
    const { data: changedPages, error } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select(
        "id,slug,name,pageType,lang,changes,primaryPage,online,currentEditor"
      )
      .eq("app", this.appUuid)
      .not("changes", "is", null);

    if (error) {
      throw apiError("ERROR_GETTING_CHANGES", error);
    }
    const { data: offlinePages, error: offlinePagesError } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select("id,slug,name,pageType,lang,changes,primaryPage,online")
      .eq("app", this.appUuid)
      .is("currentEditor", null)
      .eq("online", false);

    if (offlinePagesError) {
      throw apiError("ERROR_GETTING_OFFLINE_PAGES", offlinePagesError);
    }
    const takeOnlinePages = offlinePages.map((page) => ({
      ...page,
      changes: ["Take Online"],
    }));
    const filteredChangedPages = changedPages.filter(
      (page) => !takeOnlinePages.some((t) => t.id === page.id)
    );
    //merge the two arrays, overwrite the changedPages with the takeOnlinePages
    const mergedPages = [...filteredChangedPages, ...takeOnlinePages];

    //check for theme changes
    const { data: websiteConfig } = await this.supabase
      .from(CHAI_APPS_TABLE_NAME)
      .select("changes")
      .eq("id", this.appUuid)
      .not("changes", "is", null)
      .single();

    if (websiteConfig) {
      mergedPages.push({
        id: "THEME",
        slug: "",
        name: "Theme",
        pageType: "theme",
        lang: "",
        changes: ["Updated"],
        primaryPage: null,
        online: true,
      });
    }

    return mergedPages;
  }

  async getLinks(ids: string[], lang: string = "", draft: boolean = false) {
    return [];
  }

  async getLink(
    draft: boolean,
    pageType: string,
    id: string,
    lang: string = ""
  ) {
    const query = this.supabase
      .from(draft ? CHAI_PAGES_TABLE_NAME : CHAI_ONLINE_PAGES_TABLE_NAME)
      .select("id,primaryPage,slug,lang")
      .eq("app", this.appUuid)
      .eq("pageType", pageType);

    if (lang) {
      query.eq("lang", lang).eq("primaryPage", id);
    } else {
      query.eq("id", id);
    }

    const { data, error } = await query;

    if (error) {
      throw apiError("DRAFT_PAGE_LINK_ERROR", error);
    }
    const row = data.length === 1 ? data[0] : (find(data, { lang }) ?? data[0]);
    return get(row, "slug", "");
  }

  isUUID = (query: string) => {
    return query.length === 36;
  };

  async searchPages(pageType: string, query: string = "") {
    let query_builder = this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select("id, slug, name")
      .eq("app", this.appUuid)
      .is("primaryPage", null)
      .eq("pageType", pageType);

    const isUuid = this.isUUID(query);
    if (!isUuid) {
      query_builder = query_builder.or(
        `slug.ilike.%${query}%,name.ilike.%${query}%`
      );
    } else {
      query_builder = query_builder.eq("id", query);
    }

    const { data, error } = await query_builder;

    if (error) {
      throw apiError("ERROR_SEARCHING_PAGES", error);
    }

    return data;
  }

  async getCurrentEditor(id: string) {
    // check if the page is locked
    const { data: pageData, error: pageError } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select("currentEditor")
      .eq("id", id)
      .eq("app", this.appUuid)
      .single();

    return pageData?.currentEditor;
  }

  /**
   * Recursively deletes all children of a parent page
   * @param parentId - The ID of the parent page
   * @param deletedIds - Array to collect deleted page IDs
   */
  private async deleteChildrenRecursive(parentId: string, deletedIds: string[] = []) {
    const { data: childPages } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select("id")
      .eq("parent", parentId)
      .eq("app", this.appUuid);

    for (const childPage of childPages || []) {
      await this.deleteChildrenRecursive(childPage.id, deletedIds);
      await this.deleteLanguagePages(childPage.id);
      await this.chaiLibraries.unmarkAsTemplate({ id: childPage.id });
      await this.revisions.deleteRevisions({ id: childPage.id });
      await this.supabase
        .from(CHAI_PAGES_TABLE_NAME)
        .delete()
        .eq("id", childPage.id);
      await this.supabase
        .from(CHAI_ONLINE_PAGES_TABLE_NAME)
        .delete()
        .eq("id", childPage.id);
      await this.supabase
        .from(CHAI_ONLINE_PAGES_TABLE_NAME)
        .delete()
        .eq("primaryPage", childPage.id);
      deletedIds.push(childPage.id);
    }
  }

  /**
   * Deletes a page and its associated data
   * @param id - The ID of the page to delete
   * @returns Object containing tags for cache invalidation and deleted page data
   */
  async deletePage(id: string) {
    // Check if page is currently being edited by another user
    const currentEditor = await this.getCurrentEditor(id);
    if (currentEditor && currentEditor !== this.chaiUser) {
      return { code: "PAGE_LOCKED", editor: currentEditor };
    }

    // Get the page type and full page data
    const pageType = await this.getPageType(id);
    const { data: deletedPage, error: deletedPageError } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select("id, slug, lang, pageType, name, online, seo, primaryPage")
      .eq("id", id)
      .single();

    // Format the deleted page data, handling primary page references
    const deletedPageData = omit(
      deletedPage?.primaryPage
        ? { ...deletedPage, id: deletedPage.primaryPage }
        : deletedPage,
      ["primaryPage"]
    );

    if (deletedPageError) {
      throw apiError("ERROR_DELETING_PAGE", deletedPageError);
    }

    // Helper to collect child page IDs recursively
    const collectChildPageIds = async (parentId: string): Promise<string[]> => {
      const { data: childPages } = await this.supabase
        .from(CHAI_PAGES_TABLE_NAME)
        .select("id")
        .eq("parent", parentId)
        .eq("app", this.appUuid);
      const ids: string[] = [];
      for (const child of childPages || []) {
        ids.push(child.id);
        const nestedIds = await collectChildPageIds(child.id);
        ids.push(...nestedIds);
      }
      return ids;
    };

    // Handle secondary language page deletion (only that page + its children)
    if (pageType === "language") {
      const primaryPage = await this.getPrimaryPage(id);
      const deletedChildPageIds: string[] = [];

      // Delete nested children recursively
      await this.deleteChildrenRecursive(id, deletedChildPageIds);

      // Delete the language page itself
      await this.deleteLanguagePages(id);
      const { error } = await this.supabase.from(CHAI_PAGES_TABLE_NAME).delete().eq("id", id);
      await this.supabase.from(CHAI_ONLINE_PAGES_TABLE_NAME).delete().eq("id", id);
      await this.supabase.from(CHAI_ONLINE_PAGES_TABLE_NAME).delete().eq("primaryPage", id);

      if (error) {
        throw apiError("ERROR_DELETING_PAGE", error);
      }
      return {
        tags: [
          `page-${primaryPage}`,
          `page-${id}`,
          ...deletedChildPageIds.map((cid) => `page-${cid}`),
        ],
        deletedNestedChildren: deletedChildPageIds.length,
        totalDeleted: 1 + deletedChildPageIds.length,
      };
    }

    // Handle primary page deletion (delete language variants + all nested children)
    // Get all language variants
    const { data: languagePages } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select("id, lang, name")
      .eq("primaryPage", id)
      .eq("app", this.appUuid);

    // Track language page IDs and all deleted children
    const languagePageIds = (languagePages || []).map((lp) => lp.id);
    const deletedChildPageIds: string[] = [];

    // Delete nested children of primary page recursively
    await this.deleteChildrenRecursive(id, deletedChildPageIds);

    // Delete nested children of each language variant
    for (const langPage of languagePages || []) {
      await this.deleteChildrenRecursive(langPage.id, deletedChildPageIds);
    }

    await this.deleteLanguagePages(id); // Delete language variants
    await this.chaiLibraries.unmarkAsTemplate({ id });

    await this.revisions.deleteRevisions({ id });

    //Delete the page from app pages table
    const { error: deleteError } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .delete()
      .eq("id", id);

    //Delete the page from online pages table
    await this.supabase
      .from(CHAI_ONLINE_PAGES_TABLE_NAME)
      .delete()
      .eq("id", id);
    await this.supabase
      .from(CHAI_ONLINE_PAGES_TABLE_NAME)
      .delete()
      .eq("primaryPage", id);

    if (deleteError) {
      throw apiError("ERROR_DELETING_PAGE", deleteError);
    }

    if (pageType === "partial") {
      const pagesUsingPartial = await this.pageBlocks.getPartialBlockUsage(id);
      return {
        tags: [
          ...pagesUsingPartial.map((page) => `page-${page}`),
          ...languagePageIds.map((langId) => `page-${langId}`),
          ...deletedChildPageIds.map((childId) => `page-${childId}`),
        ],
        deletedLanguagePages: languagePageIds.length,
        deletedNestedChildren: deletedChildPageIds.length,
        totalDeleted: languagePageIds.length + deletedChildPageIds.length,
      };
    }

    // Return tags for cache invalidation and deleted page data
    return {
      tags: [
        `page-${id}`,
        ...languagePageIds.map((langId) => `page-${langId}`),
        ...deletedChildPageIds.map((childId) => `page-${childId}`),
      ],
      page: deletedPageData,
      deletedLanguagePages: languagePageIds.length,
      deletedNestedChildren: deletedChildPageIds.length,
      totalDeleted: 1 + languagePageIds.length + deletedChildPageIds.length,
    };
  }

  async getPrimaryPage(id: string) {
    const { data, error } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select("id,primaryPage")
      .eq("id", id)
      .single();

    if (error) {
      throw apiError("ERROR_GETTING_PRIMARY_PAGE", error);
    }

    return data?.primaryPage ?? data?.id;
  }

  async deleteLanguagePages(id: string) {
    const currentEditor = await this.getCurrentEditor(id);
    if (currentEditor !== this.chaiUser) {
      return { code: "PAGE_LOCKED", editor: currentEditor };
    }

    // Get all language pages for this primary page
    const { data: languagePages } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select("id")
      .eq("primaryPage", id)
      .eq("app", this.appUuid);

    // Delete children of each language page recursively
    for (const langPage of languagePages || []) {
      await this.deleteChildrenRecursive(langPage.id, []);
    }

    // Delete the language pages themselves
    await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .delete()
      .eq("primaryPage", id);
  }

  async getPageType(id: string): Promise<"primary" | "partial" | "language"> {
    const { data, error } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select("primaryPage, pageType, slug")
      .eq("id", id)
      .single();

    if (error) {
      throw apiError("PAGE_NOT_FOUND", error);
    }

    return isEmpty(data.slug)
      ? "partial"
      : !data.primaryPage
        ? "primary"
        : "language";
  }

  async exists(slug: string, pageType: string = "page") {
    const { data } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select("id")
      .eq("slug", slug)
      .eq("pageType", pageType)
      .eq("app", this.appUuid)
      .single();
    return !!data;
  }

  async createPage(page: {
    tracking: Record<string, any>;
    seo?: Record<string, any>;
    jsonLD?: Record<string, any>;
    name: string;
    slug: string;
    pageType: string;
    parent?: string | null;
    lang: string;
    primaryPage: string | null;
    dynamic?: boolean;
    hasSlug: boolean;
    template?: string;
    dynamicSlugCustom?: string;
  }) {
    if (page.hasSlug && (await this.exists(page.slug, page.pageType))) {
      throw new Error("SLUG_ALREADY_USED");
    }

    let blocks: ChaiBlock[] = [];
    // if using a template, get the blocks from the template
    if (page.template) {
      const { data: template, error: templateError } = await this.supabase
        .from("library_templates")
        .select("pageId, library(id, app, name)")
        .eq("id", page.template)
        .single();

      if (templateError) {
        throw new Error("ERROR_GETTING_TEMPLATE_BLOCKS");
      }

      const { pageId } = template;
      const { data: templateBlock, error: templateBlocksError } =
        await this.supabase
          .from("app_pages")
          .select("blocks")
          .eq("id", pageId)
          .single();

      if (templateBlocksError) {
        throw new Error("ERROR_GETTING_TEMPLATE_BLOCKS");
      }

      blocks = templateBlock.blocks;
      // convert GlobalBlock to PartialBlock
      blocks = blocks.map((block) => {
        if (block._type === "GlobalBlock" && !isEmpty(block.globalBlock)) {
          return {
            ...block,
            _type: "PartialBlock",
            partialBlockId: block.globalBlock,
          };
        }
        return block;
      });

      const isSiteLibrary = get(template, "library.app", "") === this.appUuid;

      if (!isSiteLibrary) {
        const libraryName = get(template, "library.name", "");
        // check if the blocks have any partial blocks
        const partialBlocks = blocks.filter(
          (block) =>
            block._type === "PartialBlock" && !isEmpty(block.partialBlockId)
        );

        // foreach partial block, get the partialBlockId(page id from app_pages table) and create new pages inside app_pages table
        // it will have a new id, but add a new column called `libRefId` and set it to the partial page id
        // then update the partial block with the new page id
        const newPages = await Promise.all(
          partialBlocks.map(({ partialBlockId }) =>
            this.pageBlocks.copyFromTemplate(partialBlockId, libraryName)
          )
        );
        // update the partial blocks with the new page ids
        blocks = blocks.map((block) => {
          const newPage = newPages.find(
            (page) => page.libRefId === block.partialBlockId
          );
          if (newPage) {
            block._name = `${libraryName} - ${block._name}`;
            block.partialBlockId = newPage.id;
          }
          return block;
        });
      }
    }

    // add a new page in app_pages table
    const { data: newPage, error: appPagesError } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .insert({
        slug: page.slug,
        app: this.appUuid,
        lang: page.lang,
        blocks: blocks,
        name: page.name,
        primaryPage: page.primaryPage,
        pageType: page.pageType,
        parent: page.parent,
        dynamic: page.dynamic ?? false,
        dynamicSlugCustom: page.dynamicSlugCustom ?? "",
        seo: page.seo ?? {
          title: page.name,
          jsonLD: "",
          noIndex: false,
          ogImage: "",
          ogTitle: "",
          noFollow: "",
          description: "",
          searchTitle: "",
          cononicalUrl: "",
          ogDescription: "",
          searchDescription: "",
        },
        tracking: page.tracking ?? {},
      })
      .select("id, slug, lang, pageType, parent, name, online, primaryPage")
      .single();

    if (appPagesError) {
      console.error(appPagesError);
      throw new Error("ERROR_CREATING_PAGE");
    }
    return omit(
      newPage.primaryPage ? { ...newPage, id: newPage.primaryPage } : newPage,
      ["primaryPage"]
    );
  }

  async getWebsitePages(lang: string) {
    // First, get all pages
    const { data: pages, error } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select(
        `
        id,
        name,
        slug,
        pageType,
        currentEditor,
        parent,
        online,
        lastSaved,
        createdAt,
        dynamic,
        dynamicSlugCustom,
        primaryPage
      `
      )
      .eq("app", this.appUuid)
      .eq("lang", lang);

    if (error) {
      throw apiError("ERROR_GETTING_WEBSITE_PAGES", error);
    }

    // Get template information for all pages in a single query
    const { data: templates, error: templatesError } = await this.supabase
      .from("library_templates")
      .select("pageId")
      .in(
        "pageId",
        pages?.filter((page) => !isEmpty(page.slug)).map((page) => page.id) ||
          []
      );

    if (templatesError) {
      throw apiError("ERROR_GETTING_TEMPLATE_INFO", templatesError);
    }

    // Create a set of pageIds that are templates for O(1) lookup
    const templatePageIds = new Set((templates || []).map((t) => t.pageId));

    // Map the pages with template information
    return (pages ?? []).map((page) => ({
      ...page,
      pageType: page.pageType ?? "page",
      isTemplate: templatePageIds.has(page.id),
    }));
  }

  async isPageOnline(slug: string) {
    const { data, error } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select("id")
      .eq("slug", slug)
      .eq("online", true)
      .eq("app", this.appUuid)
      .single();
    if (error) {
      throw apiError("PAGE_NOT_FOUND", error);
    }
    return true;
  }

  async getPageMeta(
    slug: string,
    draft: boolean,
    dynamicSegments: Record<string, string> = {}
  ) {
    const table = draft ? CHAI_PAGES_TABLE_NAME : CHAI_ONLINE_PAGES_TABLE_NAME;
    // check for direct slug match
    let query = this.supabase
      .from(table)
      .select("id,slug,lang,primaryPage,name,pageType")
      .eq("slug", slug)
      .eq("dynamic", false)
      .eq("app", this.appUuid);

    const { data: page } = await query.single();

    if (page) {
      return omit(
        {
          ...page,
          id: page?.primaryPage ?? page?.id,
          languagePageId: page?.id,
        },
        ["primaryPage"]
      );
    }

    // slug: /blog/post-1, pick /blog/ or if /en/blog/post-1/ then pick /en/blog/
    const strippedSlug = slug.slice(1);
    const segment1 = `/${take(strippedSlug.split("/"), 1).join("/")}`;
    const segment2 = `/${take(strippedSlug.split("/"), 2).join("/")}`;

    // get all non page and global pages
    const { data: pages, error: pagesError } = await this.supabase
      .from(table)
      .select("id,slug,lang,primaryPage,name,pageType,dynamicSlugCustom")
      .or(`slug.ilike.%${segment1}%,slug.ilike.%${segment2}%`)
      .eq("dynamic", true)
      .eq("app", this.appUuid);

    const sortedPages = reverse(
      sortBy(pages ?? [], ({ slug }) => slug.split("/").length)
    );

    //Sort sortedPages in the order of the keys(dynamicSegments)
    const dynamicKeys = keys(dynamicSegments);
    if (dynamicKeys.length > 0) {
      sortedPages.sort((a, b) => {
        const aIndex = dynamicKeys.indexOf(a.pageType);
        const bIndex = dynamicKeys.indexOf(b.pageType);
        // If not found, put at the end
        const aOrder = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
        const bOrder = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
        return aOrder - bOrder;
      });
    }

    for (const page of sortedPages) {
      if (isEmpty(page.slug)) {
        continue;
      }
      const pageType = page.pageType;
      const regex = get(dynamicSegments, pageType, "");
      const reg = new RegExp(page.slug + regex + page.dynamicSlugCustom);
      const match = slug.match(reg);
      if (match && match[0] === slug) {
        return omit(
          {
            ...page,
            slug,
            id: page?.primaryPage ?? page?.id,
            languagePageId: page?.id,
          },
          ["primaryPage", "dynamicSlugCustom"]
        );
      }
    }

    throw apiError("PAGE_NOT_FOUND", new Error("page not found"));
  }

  async getPageId(slug: string, draft: boolean) {
    const table = draft ? CHAI_PAGES_TABLE_NAME : CHAI_ONLINE_PAGES_TABLE_NAME;
    let query = this.supabase
      .from(table)
      .select("id, slug, lang, primaryPage")
      .eq("app", this.appUuid);

    const { data, error } = await query;

    const template = getTemplate(data?.map((page) => page.slug) ?? [], slug);

    if (template === null) {
      throw apiError("PAGE_NOT_FOUND", error);
    }

    const page = find(data, { slug: template });
    return page?.primaryPage || page?.id;
  }

  async updatePage(page: UpdatePageBody) {
    if (has(page, "blocks")) {
      // check if the page is locked
      const { data: pageData, error: pageError } = await this.supabase
        .from(CHAI_PAGES_TABLE_NAME)
        .select("currentEditor")
        .eq("id", page.id)
        .eq("app", this.appUuid)
        .single();

      if (pageData?.currentEditor !== this.chaiUser) {
        return { code: "PAGE_LOCKED", editor: pageData?.currentEditor };
      }
    }

    const pagesColumns = pick(page, [
      "slug",
      "name",
      "seo",
      "blocks",
      "currentEditor",
      "buildTime",
      "parent",
      "pageType",
      "dynamic",
      "dynamicSlugCustom",
      "tracking",
    ]);
    const { error } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .update({ ...pagesColumns, changes: ["Updated"], lastSaved: "now()" })
      .eq("app", this.appUuid)
      .eq("id", page.id);

    if (error) {
      throw apiError("ERROR_UPDATING_PAGE", error);
    }

    const onlyBlocks =
      keys(pagesColumns).includes("blocks") && keys(pagesColumns).length === 1;

    if (!onlyBlocks) {
      const { data: updatedPage, error: updatedPageError } = await this.supabase
        .from(CHAI_PAGES_TABLE_NAME)
        .select("id, slug, lang, pageType, name, online, parent, seo, tracking")
        .eq("id", page.id)
        .single();

      if (updatedPageError) {
        throw apiError("ERROR_GETTING_PAGE", updatedPageError);
      }

      return { page: updatedPage };
    }
    return { success: true };
  }

  async getPage(
    id: string,
    draft: boolean,
    mergePartials: boolean = false,
    editor: boolean = true
  ) {
    const table = draft ? CHAI_PAGES_TABLE_NAME : CHAI_ONLINE_PAGES_TABLE_NAME;
    const primaryPage = id;
    let blocks: ChaiBlock[] = [];
    let pageData: any = {};
    let query = this.supabase
      .from(table)
      .select(
        "id,name,slug,lang,primaryPage,seo,currentEditor,pageType,lastSaved,tracking,dynamic,parent"
      )
      .eq("app", this.appUuid);

    query.eq("id", id);

    const { data, error } = await query.single();

    if (error) throw apiError("PAGE_NOT_FOUND", error);

    const primaryPageId = data?.primaryPage ?? data?.id;

    const { data: blocksData } = await this.supabase
      .from(table)
      .select("blocks")
      .eq("id", primaryPageId)
      .single();

    blocks = blocksData?.blocks ?? [];
    pageData = data;

    blocks = mergePartials
      ? await this.pageBlocks.getMergedBlocks(blocks, draft)
      : blocks;

    let canTakePage = false;
    if (draft && editor) {
      // Parse PostgreSQL UTC timestamp and ensure we're comparing in UTC
      const lastSaved = new Date(data?.lastSaved);
      const now = new Date();
      canTakePage = data?.lastSaved
        ? differenceInMinutes(now, lastSaved) > 5
        : false;

      const isCurrentEditorNull = data?.currentEditor === null;
      if (isCurrentEditorNull || canTakePage) {
        // update currentEditor to this.chaiUser
        await this.supabase
          .from(CHAI_PAGES_TABLE_NAME)
          .update({ currentEditor: this.chaiUser, lastSaved: "now()" })
          .eq("id", primaryPageId);
      } else if (data?.currentEditor === this.chaiUser) {
        // update lastSaved to now()
        await this.supabase
          .from(CHAI_PAGES_TABLE_NAME)
          .update({ lastSaved: "now()" })
          .eq("id", primaryPageId);
      }
    }

    const currentEditor =
      draft && editor && (data?.currentEditor === null || canTakePage)
        ? this.chaiUser
        : data?.currentEditor;

    return { ...pageData, blocks, id, currentEditor, languagePageId: data?.id };
  }

  async getLanguagePages(id: string) {
    const { data, error } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select(
        "id,name,slug,lang,primaryPage,pageType,seo,currentEditor,online,parent,metadata,tracking,dynamic,dynamicSlugCustom"
      )
      .or(`primaryPage.eq.${id},id.eq.${id}`)
      .eq("app", this.appUuid);

    if (error) {
      throw apiError("LANGUAGE_PAGES_ERROR", error);
    }
    return data.map((page) => omit(page, ["app"]));
  }

  async getOnlineLanguagePages(id: string) {
    const { data, error } = await this.supabase
      .from(CHAI_ONLINE_PAGES_TABLE_NAME)
      .select(
        "id,name,slug,lang,primaryPage,pageType,seo,currentEditor,online,metadata,tracking,dynamic,dynamicSlugCustom"
      )
      .or(`primaryPage.eq.${id},page.eq.${id}`)
      .eq("app", this.appUuid);

    if (error) {
      throw apiError("ONLINE_LANGUAGE_PAGES_ERROR", error);
    }
    return data.map((page) => omit(page, ["app"]));
  }

  async markAsTemplate(id: string, libraries: any) {
    try {
      // Get the page details to use for the template
      const page = await this.getPageById(id);
      if (!page) {
        throw new Error("Page not found");
      }

      // Get the page blocks
      const pageData = await this.getPage(
        id,
        true, // draft version
        false, // don't merge partials
        false // not for editor
      );

      if (!pageData || !pageData.blocks) {
        throw new Error("No blocks found for the page");
      }

      // Get first available library
      if (!libraries || libraries.length === 0) {
        throw new Error("No libraries available");
      }

      // Return the page and necessary data for creating template
      return {
        pageId: id,
        name: `Template from ${page.name || page.slug}`,
        libraryId: libraries[0].id,
        group: page.pageType || "page",
      };
    } catch (error) {
      throw apiError("ERROR_MARKING_AS_TEMPLATE", error);
    }
  }
}
