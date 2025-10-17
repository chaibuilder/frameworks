import { ChaiBlock } from "@chaibuilder/sdk";
import { SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { map, set, uniq } from "lodash";
import { ChaiBuilderDAM } from "./ChaiBuilderDAM";
import { apiError } from "./lib";

export class ChaiBuilderLibraries {
  private dam: ChaiBuilderDAM;
  constructor(
    private supabase: SupabaseClient,
    private appUuid: string,
    private chaiUser: string,
  ) {
    this.dam = new ChaiBuilderDAM(supabase, appUuid, chaiUser);
  }

  async getLibraryGroups() {
    const library = await this.getSiteLibrary();
    if (!library) {
      return [];
    }
    const { data, error } = await this.supabase.from("library_items").select("group").eq("library", library?.id);

    if (error) {
      console.error("Error fetching library groups:", error);
      throw apiError("GET_LIBRARY_GROUPS_FAILED", error);
    }

    return map(uniq(map(data, "group")), (group) => ({
      id: group,
      name: group,
    }));
  }

  async upsertLibraryItem(data: {
    name: string;
    group: string;
    blocks: ChaiBlock[];
    description?: string;
    previewImage?: string;
    id?: string;
  }) {
    const { name, group, blocks, description, previewImage, id } = data;
    let previewImageUrl = null;
    const library = await this.getSiteLibrary();
    if (!library) {
      return apiError("GET_SITE_LIBRARY_FAILED", "Library not found");
    }
    if (previewImage) {
      const uploadedImage = await this.dam.uploadAssetToStorage({
        base64File: previewImage,
        path: "library-previews/" + library.id,
      });
      if (uploadedImage.url) {
        previewImageUrl = uploadedImage.url;
      }
    }

    let returnData = null;
    if (id) {
      const { data: updatedBlock, error } = await this.supabase
        .from("library_items")
        .update({
          name,
          blocks,
          library: library.id,
          description,
          group,
          user: this.chaiUser,
          ...(previewImageUrl ? { preview: previewImageUrl } : {}),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) {
        throw apiError("UPDATE_LIBRARY_ITEM_FAILED", error);
      }
      returnData = updatedBlock;
    } else {
      const uuid = crypto.randomUUID();
      set(blocks, "0._libBlockId", uuid);
      const { data: newBlock, error } = await this.supabase
        .from("library_items")
        .insert({
          id: uuid,
          name,
          blocks,
          library: library.id,
          description,
          group,
          user: this.chaiUser,
          ...(previewImageUrl ? { preview: previewImageUrl } : {}),
        })
        .select("*")
        .single();
      if (error) {
        throw apiError("CREATE_LIBRARY_ITEM_FAILED", error);
      }
      returnData = newBlock;
    }

    return returnData;
  }

  async getTemplatesByType(data: { pageType: string; library: string }) {
    const { data: sharedLibraries, error: sharedLibrariesError } = await this.supabase
      .from("libraries")
      .select("id")
      .eq("type", "shared");

    if (sharedLibrariesError) {
      console.error("Error fetching shared libraries:", sharedLibrariesError);
      throw sharedLibrariesError;
    }
    const { pageType, library } = data;
    const { data: templates, error } = await this.supabase
      .from("library_templates")
      .select("*")
      .eq("pageType", pageType)
      .in("library", [library, ...sharedLibraries.map((lib) => lib.id)]);

    if (error) {
      console.error("Error fetching templates:", error);
      throw error;
    }
    return templates;
  }

  async getSiteLibrary() {
    const { data, error } = await this.supabase
      .from("libraries")
      .select("createdAt,id,name,type")
      .eq("app", this.appUuid)
      .maybeSingle();

    if (error) {
      console.error("Error fetching site library:", error);
      throw error;
    }

    return data;
  }

  async getLibraries() {
    const siteLibrary = await this.getSiteLibrary();
    // get the client id from the apps table
    const { data: app, error: appError } = await this.supabase
      .from("apps")
      .select("client")
      .eq("id", this.appUuid)
      .single();
    if (appError) {
      console.error("Error fetching app:", appError);
      throw appError;
    }
    const clientId = app.client;
    // Fetch libraries that are either global (app is null) or belong to the current app
    const { data, error } = await this.supabase
      .from("libraries")
      .select("createdAt,id,name,type")
      .eq("client", clientId);

    if (error) {
      console.error("Error fetching libraries:", error);
      throw error;
    }

    return (data || []).map((lib) => {
      // Ensure the site library is always included
      return { ...lib, isSiteLibrary: lib.id === siteLibrary?.id };
    });
  }

  async getLibraryItems({ id }: { id: string }) {
    if (!id) {
      return [];
    }
    const { data, error } = await this.supabase
      .from("library_items")
      .select("id, name, library, group, description, preview")
      .eq("library", id);

    if (error) {
      console.error("Error fetching library items:", error);
      throw error;
    }

    return data;
  }

  async getLibraryItem({ id }: { id: string }) {
    const { data, error } = await this.supabase
      .from("library_items")
      .select("*,library(app,name)")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching library item:", error);
      throw apiError("GET_LIBRARY_ITEM_FAILED", error);
    }

    if (data.library.app === this.appUuid) {
      // set the _libBlockId from the first block
      set(data.blocks, "0._libBlockId", data.id);
    } else {
      // remove the _libBlockId from the first block
      set(data.blocks, "0._libBlockId", undefined);
    }
    //remove the library field
    delete data.library;

    return data;
  }

  async deleteLibraryItem(data: { id: string }) {
    const { id } = data;
    const { error } = await this.supabase.from("library_items").delete().eq("id", id);

    if (error) {
      throw apiError("DELETE_LIBRARY_ITEM_FAILED", error);
    }

    return { success: true };
  }

  async upsertLibraryBlock(data: {
    blocks: ChaiBlock[];
    name: string;
    libraryId: string;
    id?: string;
    group?: string;
    pageId?: string;
  }) {
    try {
      const { blocks, name, libraryId, id, group, pageId } = data;

      if (id) {
        // Update existing library block
        const { data: updatedBlock, error } = await this.supabase
          .from("library_items")
          .update({
            name,
            blocks,
            library: libraryId,
            description: null, //  Can be added as a parameter if needed
            group,
            user: this.chaiUser,
          })
          .eq("id", id)
          .select()
          .single();

        if (error) {
          throw apiError("UPDATE_FAILED", error);
        }
        return updatedBlock;
      } else {
        // Insert new library block
        const { data: newBlock, error } = await this.supabase
          .from("library_items")
          .insert({
            name,
            blocks,
            library: libraryId,
            description: null, // Can be added as a parameter if needed
            preview: null, // Can be added as a parameter if needed
            group,
            type: "block",
            user: this.chaiUser,
          })
          .select()
          .single();

        if (error) {
          throw apiError("UPDATE_BLOCK_FAILED", error);
        }
        return newBlock;
      }
    } catch (error) {
      console.error("Error upserting library block:", error);
      throw error;
    }
  }

  async markAsTemplate(
    data: {
      pageId: string;
      description?: string;
      name: string;
      pageType: string;
      previewImage?: string;
    },
    previewImage?: string,
  ) {
    const { pageId, description, name, pageType } = data;

    let previewImageUrl = null;
    const library = await this.getSiteLibrary();
    if (previewImage) {
      const uploadedImage = await this.dam.uploadAssetToStorage({
        base64File: previewImage,
        path: "library-previews/" + library?.id,
      });
      if (uploadedImage.url) {
        previewImageUrl = uploadedImage.url;
      }
    }

    const { data: template, error } = await this.supabase
      .from("library_templates")
      .insert({
        library: library.id,
        user: this.chaiUser,
        pageId: pageId,
        description: description,
        name: name + " Template",
        pageType: pageType,
        preview: previewImageUrl,
      })
      .select("library,pageType,pageId,id,description,preview")
      .single();

    if (error) {
      throw apiError("UPDATE_FAILED", error);
    }
    return template;
  }

  async unmarkAsTemplate(data: { id: string }) {
    const { id } = data;
    const { error } = await this.supabase.from("library_templates").delete().eq("pageId", id);

    if (error) {
      throw apiError("DELETE_FAILED", error);
    }
    return { success: true };
  }
}
