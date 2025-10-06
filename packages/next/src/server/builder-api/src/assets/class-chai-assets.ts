import { isEmpty, set } from "lodash";
import { getSupabaseAdmin } from "../../../supabase";
import { AssetUploaderInterface, SupabaseStorageUploader } from "./class-chai-uploader";

type ChaiAsset = any;

export class ChaiAssets {
  private uploader: AssetUploaderInterface;

  constructor(
    private appId: string,
    private userId: string,
  ) {
    this.uploader = new SupabaseStorageUploader(appId);
  }

  private appendUpdatedAtToUrl(url: string, updatedAt: string): string {
    if (isEmpty(url)) {
      return "";
    }
    const urlObj = new URL(url);
    const timestamp = new Date(updatedAt).getTime();
    urlObj.searchParams.set("t", timestamp.toString());
    return `${urlObj.origin}${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
  }

  async upload({
    file,
    folderId,
    name,
    optimize = true,
  }: {
    name: string;
    file: string;
    folderId?: string | null;
    optimize?: boolean;
  }): Promise<any | { error: string }> {
    try {
      // Check if the file is an SVG
      const isSvg = name.toLowerCase().endsWith(".svg") || file.includes("data:image/svg+xml");

      // Upload using appropriate method
      const uploadedAsset = isSvg
        ? await this.uploader.uploadSvg({
            file,
            folderId,
            name,
          })
        : await this.uploader.upload({
            file,
            folderId,
            name,
            optimize,
          });

      // Prepare the asset data for Supabase
      const assetData = {
        name,
        app: this.appId,
        url: uploadedAsset.url,
        thumbnailUrl: uploadedAsset.thumbnailUrl,
        size: uploadedAsset.size?.toString(),
        width: uploadedAsset.width,
        height: uploadedAsset.height,
        format: uploadedAsset.mimeType.split("/")[1],
        folderId: folderId,
        type: uploadedAsset.mimeType.startsWith("image/") ? "image" : "file",
        createdBy: this.userId,
        updatedAt: new Date().toISOString(),
      };

      const supabase = await getSupabaseAdmin();
      // Insert into app_assets table
      const { data, error } = await supabase.from("app_assets").insert(assetData).select("*").single();

      if (error) {
        throw new Error(`Failed to store asset in database: ${error.message}`);
      }

      // Return the ChaiAsset format
      return {
        id: data.id,
        name: data.name,
        type: data.type,
        url: this.appendUpdatedAtToUrl(data.url, data.updatedAt),
        size: data.size,
        thumbnailUrl: this.appendUpdatedAtToUrl(data.thumbnailUrl || "", data.updatedAt),
        width: data.width,
        height: data.height,
        format: data.format,
        folderId: data.folderId,
        createdBy: data.createdBy || "",
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      return { error: errorMessage };
    }
  }

  async getAsset({ id }: { id: string }): Promise<ChaiAsset | { error: string }> {
    try {
      const supabase = await getSupabaseAdmin();
      const { data, error } = await supabase.from("app_assets").select("*").eq("id", id).eq("app", this.appId).single();

      if (error) {
        throw new Error(`Failed to fetch asset: ${error.message}`);
      }
      set(data, "url", this.appendUpdatedAtToUrl(data.url, data.updatedAt));
      set(data, "thumbnailUrl", this.appendUpdatedAtToUrl(data.thumbnailUrl || "", data.updatedAt));
      return data as ChaiAsset;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      return { error: errorMessage };
    }
  }

  async getAssets({
    search = "",
    page = 1,
    limit = 20,
  }: {
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<
    | {
        assets: Partial<ChaiAsset>[];
        total: number;
        page: number;
        pageSize: number;
      }
    | {
        error: string;
      }
  > {
    try {
      const offset = (page - 1) * limit;
      const supabase = await getSupabaseAdmin();
      // Build the query
      let assetsQuery = supabase
        .from("app_assets")
        .select("*", { count: "exact" })
        .eq("app", this.appId)
        .order("updatedAt", { ascending: false });

      if (search) {
        assetsQuery = assetsQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }
      // Apply pagination
      const { data: assetsData, error, count } = await assetsQuery.range(offset, offset + limit - 1);

      if (error) {
        throw new Error(error.message);
      }
      const assets = assetsData.map((asset) => {
        set(asset, "url", this.appendUpdatedAtToUrl(asset.url, asset.updatedAt));
        set(asset, "thumbnailUrl", this.appendUpdatedAtToUrl(asset.thumbnailUrl || "", asset.updatedAt));
        return asset;
      });
      return {
        assets,
        total: count || 0,
        page,
        pageSize: limit,
      };
    } catch (error) {
      console.error("Error fetching assets:", error);
      throw error;
    }
  }

  async deleteAsset({ id }: { id: string }): Promise<{ success: boolean } | { error: string }> {
    try {
      const supabase = await getSupabaseAdmin();
      // Delete from the database
      const { error } = await supabase.from("app_assets").delete().eq("id", id);

      if (error) {
        throw new Error(`Failed to delete asset: ${error.message}`);
      }

      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      return { error: errorMessage };
    }
  }

  async updateAsset({
    id,
    file,
    description,
  }: {
    id: string;
    file?: string;
    description?: string;
  }): Promise<ChaiAsset | { error: string }> {
    try {
      const supabase = await getSupabaseAdmin();
      // Get current asset
      const { data: currentAsset, error: fetchError } = await supabase
        .from("app_assets")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch asset: ${fetchError.message}`);
      }

      // Prepare update data
      const updateData: Record<string, unknown> = {};

      if (description !== undefined) {
        updateData.description = description;
        updateData.updatedAt = new Date().toISOString();
      }

      // Handle file update if provided
      if (file) {
        // Check if the file is an SVG to skip optimization
        const isSvg = currentAsset.format?.toLowerCase() === "svg" || file.includes("data:image/svg+xml");

        // Re-upload the file using appropriate method
        const uploadedAsset = isSvg
          ? await this.uploader.uploadSvg({
              file,
              folderId: currentAsset.folderId,
              name: currentAsset.name,
            })
          : await this.uploader.upload({
              file,
              folderId: currentAsset.folderId,
              name: currentAsset.name,
            });

        // Update asset information
        updateData.url = uploadedAsset.url;
        updateData.thumbnailUrl = uploadedAsset.thumbnailUrl;
        updateData.size = uploadedAsset.size?.toString();
        updateData.width = uploadedAsset.width;
        updateData.height = uploadedAsset.height;
        updateData.format = uploadedAsset.mimeType.split("/")[1];
        updateData.updatedAt = new Date().toISOString();
      }

      // Update the asset
      const { data: updatedAsset, error } = await supabase
        .from("app_assets")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update asset: ${error.message}`);
      }

      set(updatedAsset, "url", this.appendUpdatedAtToUrl(updatedAsset.url, updatedAsset.updatedAt));
      set(
        updatedAsset,
        "thumbnailUrl",
        this.appendUpdatedAtToUrl(updatedAsset.thumbnailUrl || "", updatedAsset.updatedAt),
      );
      return updatedAsset as ChaiAsset;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      return { error: errorMessage };
    }
  }
}
