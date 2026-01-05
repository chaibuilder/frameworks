import { get } from "lodash";
import { BenchmarkQueryAction } from "./benchmark-query";
import { ChaiAction } from "./chai-action-interface";
import { CreatePageAction } from "./create-page";
import { DeletePageAction } from "./delete-page";
import { DuplicatePageAction } from "./duplicate-page";
import { RestorePageAction } from "./restore-page";
import { GenerateHtmlFromPromptAction } from "./generate-html-from-prompt";
import { GenerateSeoFieldAction } from "./generate-seo-field";
import { GetCompareDataAction } from "./get-compare-data";
import { GetDraftPageAction } from "./get-draft-page";
import { GetLanguagePagesAction } from "./get-language-pages";
import { GetLibrariesAction } from "./get-libraries";
import { GetRevisionPageAction } from "./get-revision-page";
import { GetSiteWideDataAction } from "./get-site-wide-data";
import { GetWebsitePagesAction } from "./get-website-pages";
import { GetWebsiteSettingsAction } from "./get-website-settings";
import { UpdatePageAction } from "./update-page";
import { UpdatePageMetadataAction } from "./update-page-metadata";
import { GetTemplatesByTypeAction } from "./get-templates-by-type";

/**
 * Registry of all available actions
 * This is a singleton that holds all action handlers
 */
class ActionsRegistry {
  private static instance: ActionsRegistry;
  private actions: Record<string, ChaiAction<any, any>> = {};

  private constructor() {
    // Register all actions
    this.register("CREATE_PAGE", new CreatePageAction());
    this.register("DELETE_PAGE", new DeletePageAction());
    this.register("DUPLICATE_PAGE", new DuplicatePageAction());
    this.register("RESTORE_PAGE_REVISION", new RestorePageAction());
    this.register("UPDATE_PAGE_METADATA", new UpdatePageMetadataAction());
    this.register("GENERATE_SEO_FIELD", new GenerateSeoFieldAction());
    this.register("GENERATE_HTML_FROM_PROMPT", new GenerateHtmlFromPromptAction());
    this.register("GET_REVISION_PAGE", new GetRevisionPageAction());
    this.register("UPDATE_PAGE", new UpdatePageAction());
    this.register("GET_COMPARE_DATA", new GetCompareDataAction());
    this.register("GET_SITE_WIDE_USAGE", new GetSiteWideDataAction());
    this.register("BENCHMARK_QUERY", new BenchmarkQueryAction());
    this.register("GET_WEBSITE_DRAFT_SETTINGS", new GetWebsiteSettingsAction());
    this.register("GET_WEBSITE_PAGES", new GetWebsitePagesAction());
    this.register("GET_LIBRARIES", new GetLibrariesAction());
    this.register("GET_DRAFT_PAGE", new GetDraftPageAction());
    this.register("GET_LANGUAGE_PAGES", new GetLanguagePagesAction());
    this.register("GET_TEMPLATES_BY_TYPE", new GetTemplatesByTypeAction());
    // Add more actions here as they are created
  }

  /**
   * Get the singleton instance of the registry
   */
  public static getInstance(): ActionsRegistry {
    if (!ActionsRegistry.instance) {
      ActionsRegistry.instance = new ActionsRegistry();
    }
    return ActionsRegistry.instance;
  }

  /**
   * Register a new action handler
   */
  public register(actionName: string, handler: ChaiAction<any, any>): void {
    this.actions[actionName] = handler;
  }

  /**
   * Get an action handler by name
   */
  public getAction(actionName: string): ChaiAction<any, any> | undefined {
    return get(this.actions, actionName);
  }

  /**
   * Get all registered actions
   */
  public getAllActions(): Record<string, ChaiAction<any, any>> {
    return this.actions;
  }
}

// Export a function to get an action by name
export const getChaiAction = (action: string): ChaiAction<any, any> | undefined => {
  return ActionsRegistry.getInstance().getAction(action);
};

// Export the registry instance for direct access if needed
export default ActionsRegistry.getInstance();
