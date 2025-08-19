import { supabase } from "@/app/supabase";
import { isEmpty } from "lodash";
import { z } from "zod";
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
export class DuplicatePageAction extends BaseAction<
  DuplicatePageActionData,
  DuplicatePageActionResponse
> {
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
  async execute(
    data: DuplicatePageActionData
  ): Promise<DuplicatePageActionResponse> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }

    if (
      !isEmpty(data.slug) &&
      (await this.doesSlugExist(data.slug as string))
    ) {
      throw new ActionError("Slug already exists", "SLUG_EXISTS");
    }

    try {
      const { data: originalPage } = await supabase
        .from("app_pages")
        .select("*")
        .eq("id", data.pageId)
        .eq("app", this.context.appId)
        .single();

      if (!originalPage) {
        throw new ActionError("Page not found", "PAGE_NOT_FOUND");
      }

      const { data: result } = await supabase
        .from("app_pages")
        .insert({
          ...originalPage,
          name: data.name,
          id: undefined,
          createdAt: undefined,
          lastSaved: null,
          currentEditor: null,
          changes: null,
          online: false,
          libRefId: null,
          ...(data.slug && { slug: data.slug }),
        })
        .select()
        .single();

      return { id: result.id };
    } catch (error) {
      throw error;
    }
  }

  private async doesSlugExist(slug: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("app_pages")
      .select("id")
      .eq("slug", slug)
      .eq("app", this.context?.appId)
      .single();

    return !error && !!data;
  }
}
