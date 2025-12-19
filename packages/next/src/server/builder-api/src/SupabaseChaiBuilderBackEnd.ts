import { ChaiBlock } from "@chaibuilder/sdk";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ChaiBuilderBackEnd } from "./ChaiBuilderBackEnd";
import { ChaiBuilderDAM } from "./ChaiBuilderDAM";
import { ChaiBuilderLibraries } from "./ChaiBuilderLibraries";
import { ChaiBuilderPages } from "./ChaiBuilderPages";
import ChaiBuilderPublishChanges from "./ChaiBuilderPublishChanges";
import { ChaiBuilderWebsite } from "./ChaiBuilderWebsite";
import { ChaiPageRevisions } from "./ChaiPageRevisions";
import { ChaiBuilderAI } from "./ai/ChaiBuilderAI";
import { UpdatePageBody } from "./types";

const aiApiKey = process.env.CHAIBUILDER_AI_API_KEY!;
const aiModel = process.env.CHAIBUILDER_AI_MODEL || "gpt-4o-mini";

export class SupabaseChaiBuilderBackEnd extends ChaiBuilderBackEnd {
  private pages: ChaiBuilderPages;
  private publisher: ChaiBuilderPublishChanges;
  private website: ChaiBuilderWebsite;
  private ai: ChaiBuilderAI;
  private revisions: ChaiPageRevisions;
  private libraries: ChaiBuilderLibraries;
  private dam: ChaiBuilderDAM;
  constructor(
    private supabase: SupabaseClient,
    private appUuid: string,
    private chaiUser: string,
  ) {
    super();
    this.pages = new ChaiBuilderPages(supabase, appUuid, chaiUser);
    this.publisher = new ChaiBuilderPublishChanges(supabase, appUuid, chaiUser);
    this.website = new ChaiBuilderWebsite(supabase, appUuid, chaiUser);
    this.revisions = new ChaiPageRevisions(supabase, appUuid, chaiUser);
    this.ai = new ChaiBuilderAI();
    this.libraries = new ChaiBuilderLibraries(supabase, appUuid, chaiUser);
    this.dam = new ChaiBuilderDAM(supabase, appUuid, chaiUser);
  }

  //@ts-ignore
  async handle(args: ChaiApiActionArgs): TChaiBackendResponse<any> {
    switch (args.action) {
      case "UPSERT_LIBRARY_ITEM":
        const libraryBlock = await this.libraries.upsertLibraryItem(
          args.data as {
            name: string;
            group: string;
            blocks: ChaiBlock[];
            description?: string;
            previewImage?: string;
            id?: string;
          },
        );
        return { status: 200, data: libraryBlock };
      case "GET_LIBRARY_GROUPS":
        return { status: 200, data: [] };
      case "GET_TEMPLATES_BY_TYPE":
        const siteLibrary = await this.libraries.getSiteLibrary();
        const templates = await this.libraries.getTemplatesByType({
          ...args.data,
          library: siteLibrary?.id,
        });
        return { status: 200, data: templates };
      case "GET_ASSETS":
      case "UPLOAD_ASSET":
        const damResponse = await this.dam.handle(args);
        return { status: 200, data: damResponse };
      case "MARK_AS_TEMPLATE":
        try {
          // Get template data from pages service
          const templateData = {
            pageId: args.data.id,
            description: args.data.description ?? null,
            name: args.data.name,
            pageType: args.data.pageType,
          };

          // Create the template using libraries service
          const libraryItem = await this.libraries.markAsTemplate(templateData, args.data.previewImage);
          return { status: 200, data: { libraryItem } };
        } catch (error) {
          return this.sendError(error);
        }
      case "UNMARK_AS_TEMPLATE":
        const unmarkResponse = await this.libraries.unmarkAsTemplate(args.data as { id: string });
        return { status: 200, data: unmarkResponse };
      case "DELETE_LIBRARY_ITEM":
        const deleteLibraryItemResponse = await this.libraries.deleteLibraryItem(args.data as { id: string });
        return { status: 200, data: deleteLibraryItemResponse };
      case "GET_LIBRARY_ITEM":
        const librariesItem = await this.libraries.getLibraryItem(args.data);
        return { status: 200, data: librariesItem };
      case "GET_LIBRARY_ITEMS":
        const librariesItems = await this.libraries.getLibraryItems(args.data);
        return { status: 200, data: librariesItems };
      case "GET_LIBRARIES":
        const librariesReponse = await this.libraries.getLibraries();
        return { status: 200, data: librariesReponse };
      case "RESTORE_PAGE_REVISION":
        const restoreResponse = await this.revisions.restoreRevision(
          args.data as { revisionId: string; discardCurrent: boolean; pageId?: string },
        );
        return { status: 200, data: restoreResponse };
      case "DELETE_PAGE_REVISION":
        const deleteResponse = await this.revisions.deleteRevision(args.data as { revisionId: string });
        return { status: 200, data: deleteResponse };
      case "GET_PAGE_REVISIONS":
        const revisionsResponse = await this.revisions.getRevisions(args.data as { pageId: string });
        return { status: 200, data: revisionsResponse };
      case "GET_PAGE_BY_META":
        return this.getPageByMeta(
          args.data as {
            columns: string;
            searchText: string;
          },
        );
      case "UPSERT_PAGE_META":
        return this.upsertPageMeta(
          args.data as {
            pageId: string;
            slug: string;
            pageType: string;
            pageBlocks: string;
            dataProviders?: string;
            pageContent?: string;
            dataBindings?: string;
          },
        );
      case "RELEASE_LOCK":
        return this.releaseLock(args.data as { id?: string; user?: string });
      case "CHANGE_SLUG":
        return this.changeSlug(args.data as { id: string; slug: string });
      case "ASK_AI":
        return this.askAi(
          args.data as {
            type: "styles" | "content";
            context?: string;
            prompt: string;
            blocks: Partial<ChaiBlock>[];
            lang: string;
          },
        );
      case "GET_WEBSITE_SETTINGS":
      case "GET_WEBSITE_DRAFT_SETTINGS":
        return this.getWebsiteSettings(args.data as { draft: boolean });
      case "GET_WEBSITE_DATA":
        return this.getWebsiteData(args.data as { draft: boolean });
      case "GET_LINK":
        return this.getLink(
          args.data as {
            pageType: string;
            id: string;
            lang?: string;
            draft: boolean;
          },
        );
      case "GET_LINKS":
        return this.getLinks(args.data as { ids: string[]; lang?: string; draft: boolean });
      case "GET_PAGE_META":
        return this.getPageMeta(
          args.data as {
            slug: string;
            draft: boolean;
            dynamicSegments?: Record<string, string>;
          },
        );
      case "GET_PAGES":
        return this.getPages(args.data as { pageType: string });
      case "GET_PROJECT_PAGES":
      case "GET_WEBSITE_PAGES":
        return this.getWebsitePages(args.data as { lang?: string });
      case "GET_PAGE":
      case "GET_FULL_PAGE":
      case "GET_DRAFT_PAGE":
        return this.getFullPage(
          args.data as {
            draft: boolean;
            id: string;
            mergeGlobal?: boolean;
            mergePartials?: boolean;
            editor?: boolean;
          },
        );
      case "UPDATE_WEBSITE_SETTINGS":
        return this.updateWebsiteSettings(args.data as { settings: any });
      case "UPDATE_WEBSITE_DATA":
        return this.updateWebsiteData(args.data as { data: any });
      case "PUBLISH_CHANGES":
        return this.publishChanges(args.data as { ids?: string[] });
      case "TAKE_OFFLINE":
        return this.takeOffline(args.data as { id: string });
      case "GET_CHANGES":
        return this.getChanges();
      case "SEARCH_PAGES":
        return this.searchPages(args.data as { pageType: string; query?: string });
      case "CREATE_PAGE":
        return this.createPage(
          args.data as {
            name: string;
            slug: string;
            pageType: string;
            parent?: string;
            primaryPage?: string;
            lang?: string;
            dynamic?: boolean;
            hasSlug?: boolean;
            template?: string;
            dynamicSlugCustom?: string;
            seo?: Record<string, any>;
            jsonLD?: Record<string, any>;
            tracking?: Record<string, any>;
          },
        );
      case "UPDATE_PAGE":
        return this.updatePage(args.data as UpdatePageBody);
      case "GET_LANGUAGE_PAGES":
        return this.getLanguagePages(args.data.id as string);
      case "DELETE_PAGE":
        return this.deletePage(args.data.id as string);
      default:
        return { status: 400, error: "Invalid action" };
    }
  }

  async getPageByMeta(args: { columns: string; searchText: string }) {
    const response = await this.pages.getPageByMeta(args);
    return { status: 200, data: response };
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
    try {
      const response = await this.pages.upsertPageMeta({
        pageId: args.pageId,
        slug: args.slug,
        pageType: args.pageType,
        pageBlocks: args.pageBlocks,
        dataProviders: args.dataProviders ?? "",
        pageContent: args.pageContent ?? "",
        dataBindings: args.dataBindings ?? "",
      });
      return { status: 200, data: response };
    } catch (error) {
      return this.sendError(error);
    }
  }

  async releaseLock(args: { id?: string; user?: string }) {
    try {
      const response = await this.pages.releaseLock(args.id ?? "", args.user ?? "");
      return { status: 200, data: response };
    } catch (error) {
      return this.sendError(error);
    }
  }

  async updateWebsiteData(args: { data: any }) {
    try {
      const response = await this.website.updateWebsiteData(args.data);
      return { status: 200, data: response };
    } catch (error) {
      return this.sendError(error);
    }
  }

  async changeSlug(args: { id: string; slug: string }) {
    try {
      const { page } = await this.pages.changeSlug(args.id, args.slug);
      return { status: 200, data: { page } };
    } catch (error) {
      return this.sendError(error);
    }
  }

  async askAi(args: {
    type: "styles" | "content";
    prompt: string;
    blocks: Partial<ChaiBlock>[];
    lang: string;
    context?: string;
  }) {
    try {
      const response = await this.ai.askAi(args);
      return { status: 200, data: response };
    } catch (error) {
      return this.sendError(error);
    }
  }

  async getWebsiteData(args: { draft: boolean }) {
    try {
      const response = await this.website.getWebsiteData(args.draft);
      return { status: 200, data: response };
    } catch (error) {
      return this.sendError(error);
    }
  }

  async getWebsiteSettings(args: { draft: boolean }) {
    try {
      const response = await this.website.getWebsiteSettings(args.draft);
      return {
        status: 200,
        data: response,
      };
    } catch (error) {
      return this.sendError(error);
    }
  }

  async updateWebsiteSettings(args: { settings: any }) {
    try {
      const response = await this.website.updateWebsiteSettings(args.settings);
      return { status: 200, data: response };
    } catch (error) {
      return this.sendError(error);
    }
  }

  async getPages(args: { pageType: string }) {
    try {
      const response = await this.pages.getPages(args.pageType);
      return { status: 200, data: response };
    } catch (error) {
      return this.sendError(error);
    }
  }

  async publishChanges(args: { ids?: string[] }) {
    try {
      const response = await this.publisher.publishChanges(args.ids ?? []);
      return { status: 200, data: response };
    } catch (error) {
      return this.sendError(error);
    }
  }

  async takeOffline(args: { id: string }) {
    try {
      const response = await this.pages.takeOffline(args.id);
      return { status: 200, data: response };
    } catch (error) {
      return this.sendError(error);
    }
  }

  async getChanges() {
    try {
      const response = await this.pages.getChanges();
      return { status: 200, data: response };
    } catch (error) {
      return this.sendError(error);
    }
  }

  async getLinks(args: { ids: string[]; lang?: string; draft: boolean }) {
    try {
      const response = await this.pages.getLinks(args.ids, args.lang, args.draft ?? false);
      return { status: 200, data: response };
    } catch (error) {
      return this.sendError(error);
    }
  }

  async getLink(args: { pageType: string; id: string; lang?: string; draft: boolean }) {
    try {
      const response = await this.pages.getLink(args.draft ?? false, args.pageType, args.id, args.lang ?? "");
      return { status: 200, data: response };
    } catch (error) {
      return this.sendError(error);
    }
  }

  async searchPages(args: { pageType: string; query?: string }) {
    try {
      const response = await this.pages.searchPages(args.pageType, args.query);
      return { status: 200, data: response };
    } catch (error) {
      return this.sendError(error);
    }
  }

  async getPageMeta(args: { slug: string; draft: boolean; dynamicSegments?: Record<string, string> }) {
    try {
      const response = await this.pages.getPageMeta(args.slug, args.draft, args.dynamicSegments);
      return { status: 200, data: response };
    } catch (error) {
      return this.sendError(error);
    }
  }

  async deletePage(id: string) {
    try {
      const response = await this.pages.deletePage(id);
      return { status: 200, data: response };
    } catch (error) {
      return this.sendError(error);
    }
  }

  async getPageId(args: { slug: string; published?: boolean }) {
    try {
      const response = await this.pages.getPageId(args.slug, args.published || false);
      return { status: 200, data: { id: response } };
    } catch (error) {
      return this.sendError(error);
    }
  }

  async updatePage(page: UpdatePageBody) {
    try {
      const response = await this.pages.updatePage(page);
      return { status: 200, data: response };
    } catch (error) {
      return this.sendError(error);
    }
  }

  async getFullPage(args: {
    id: string;
    mergeGlobal?: boolean;
    mergePartials?: boolean;
    draft: boolean;
    editor?: boolean;
  }) {
    const pageSchema = z.object({
      draft: z.boolean(),
      id: z.string(),
      mergeGlobal: z.boolean().optional(),
      mergePartials: z.boolean().optional(),
      editor: z.boolean().optional(),
    });

    try {
      const validatedData = pageSchema.parse(args);
      const data = await this.pages.getPage(
        validatedData.id,
        validatedData.draft,
        validatedData.mergeGlobal ?? validatedData.mergePartials ?? false,
        validatedData.editor ?? true,
      );
      return { status: 200, data };
    } catch (error) {
      return this.sendError(error);
    }
  }

  async getWebsitePages(args: { lang?: string }) {
    try {
      const pages = await this.pages.getWebsitePages(args?.lang ?? "");
      return { status: 200, data: pages };
    } catch (error) {
      return this.sendError(error);
    }
  }

  async createPage(page: {
    name: string;
    slug: string;
    lang?: string;
    primaryPage?: string;
    pageType: string;
    parent?: string;
    dynamic?: boolean;
    hasSlug?: boolean;
    template?: string;
    dynamicSlugCustom?: string;
    seo?: Record<string, any>;
    jsonLD?: Record<string, any>;
    tracking?: Record<string, any>;
  }) {
    const createPageSchema = z
      .object({
        name: z.string(),
        slug: z.string(),
        pageType: z.string(),
        parent: z.string().nullable().optional(),
        lang: z.string().optional(),
        primaryPage: z.string().optional(),
        dynamic: z.boolean().optional(),
        hasSlug: z.boolean().optional(),
        template: z.string().optional(),
        seo: z.record(z.string(), z.any()).optional(),
        jsonLD: z.record(z.string(), z.any()).optional(),
        dynamicSlugCustom: z.string().optional(),
        tracking: z.record(z.string(), z.any()).optional(),
      })
      .refine(
        (data) => {
          if (data.lang && data.lang !== "") {
            return !!data.primaryPage;
          }
          return true;
        },
        {
          message: "is required when lang option is not empty",
          path: ["primaryPage"],
        },
      );
    try {
      const validatedData = createPageSchema.parse(page);
      const newPage = await this.pages.createPage({
        tracking: validatedData.tracking ?? {},
        seo: validatedData.seo ?? {},
        jsonLD: validatedData.jsonLD ?? {},
        template: validatedData.template ?? undefined,
        name: validatedData.name,
        slug: validatedData.slug,
        pageType: validatedData.pageType,
        parent: validatedData.parent ?? null,
        lang: !validatedData.primaryPage ? "" : (validatedData.lang ?? ""),
        primaryPage: validatedData.primaryPage ?? null,
        dynamic: validatedData.dynamic ?? false,
        dynamicSlugCustom: validatedData.dynamicSlugCustom ?? "",
        hasSlug: validatedData.hasSlug ?? (validatedData.pageType === "global" ? false : true), //TODO: Remove this once we have a better way to handle this
      });
      return { status: 200, data: { page: newPage } };
    } catch (error: unknown) {
      return this.sendError(error);
    }
  }

  async getLanguagePages(id: string) {
    try {
      const response = await this.pages.getLanguagePages(id);
      return { status: 200, data: response };
    } catch (error) {
      this.sendError(error);
    }
  }

  private sendError(error: unknown) {
    if (error instanceof z.ZodError) {
      return this.sendValidationError(error);
    }
    return { status: 400, data: { error: (error as Error).message } };
  }

  private sendValidationError(error: z.ZodError<any>) {
    const errors = error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));
    return {
      status: 400,
      data: {
        error: `Invalid request data: ${errors.map((e) => `${e.field} ${e.message}`).join(", ")}`,
      },
    };
  }
}
