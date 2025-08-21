import { SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import sharp from "sharp";
import { ChaiApiActionArgs } from "./ChaiBuilderBackEnd";

export class ChaiBuilderDAM {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly appUuid: string,
    private readonly chaiUser: string
  ) {}

  async handle(args: ChaiApiActionArgs) {
    switch (args.action) {
      case "GET_ASSETS":
        return this.getAssets(args.data);
      case "UPLOAD_ASSET":
        return this.uploadAsset(args.data);
      default:
        throw new Error(`Unsupported action: ${args.action}`);
    }
  }

  async uploadAssetToStorage(data: {
    base64File: string;
    path: string;
    fileName?: string;
  }): Promise<{ error: string | null; url: string | null }> {
    const { base64File, path, fileName } = data;

    try {
      // Generate a filename if not provided
      const actualFileName = fileName || `file_${crypto.randomUUID()}`;

      // Optimize image if it's a base64 image
      if (base64File.startsWith("data:image/")) {
        const {
          buffer: optimizedBuffer,
          contentType,
          extension,
        } = await this._optimizeImage(base64File);

        // Create full storage path including file name with extension
        const fullPath = `${path}/${actualFileName}.${extension}`;

        const { error: storageError } = await this.supabase.storage
          .from("dam-assets")
          .upload(fullPath, optimizedBuffer, {
            contentType,
            upsert: true,
          });

        if (storageError) {
          return { error: storageError.message, url: null };
        }

        const {
          data: { publicUrl },
        } = this.supabase.storage.from("dam-assets").getPublicUrl(fullPath);
        return { error: null, url: publicUrl };
      } else {
        // Handle non-image files
        const buffer = Buffer.from(base64File, "base64");

        // Extract the file extension from the base64 mimetype if possible
        let fileExtension = "bin";
        const mimeMatch = base64File.match(
          /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/
        );
        if (mimeMatch) {
          const mimeType = mimeMatch[1];
          // Get extension from mime type
          const mimeExtension = mimeType.split("/")[1];
          if (mimeExtension) fileExtension = mimeExtension;
        }

        // Create full storage path including file name with extension
        const fullPath = `${path}/${actualFileName}.${fileExtension}`;

        const contentType = mimeMatch
          ? mimeMatch[1]
          : "application/octet-stream";

        const { error: storageError } = await this.supabase.storage
          .from("dam-assets")
          .upload(fullPath, buffer, {
            contentType,
            upsert: true,
          });

        if (storageError) {
          return { error: storageError.message, url: null };
        }

        const {
          data: { publicUrl },
        } = this.supabase.storage.from("dam-assets").getPublicUrl(fullPath);
        return { error: null, url: publicUrl };
      }
    } catch (error) {
      console.error("Error uploading asset to storage:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
        url: null,
      };
    }
  }

  /**
   * Optimizes an image by converting it to WebP format and resizing
   * @param imageInput - Either a base64 string or an ArrayBuffer of image data
   * @param options - Optional configurations for optimization
   * @returns Optimized image buffer and content type
   */
  private async _optimizeImage(
    imageInput: string | ArrayBuffer,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      format?: "webp" | "jpeg" | "png";
    } = {}
  ): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
    // Default options
    const {
      width = 1200,
      height = 1200,
      quality = 80,
      format = "webp",
    } = options;

    try {
      let imageBuffer: Buffer;

      // Handle base64 string input
      if (typeof imageInput === "string") {
        const base64Parts = imageInput.split(";base64,");
        const base64Data = base64Parts.length > 1 ? base64Parts[1] : imageInput;
        imageBuffer = Buffer.from(base64Data, "base64");
      } else {
        // Handle ArrayBuffer input
        imageBuffer = Buffer.from(imageInput);
      }

      // Create Sharp instance and apply transformations
      let sharpInstance = sharp(imageBuffer).resize({
        width,
        height,
        fit: "inside",
        withoutEnlargement: true,
      });

      // Apply format conversion
      if (format === "webp") {
        sharpInstance = sharpInstance.webp({ quality });
      } else if (format === "jpeg") {
        sharpInstance = sharpInstance.jpeg({ quality });
      } else if (format === "png") {
        sharpInstance = sharpInstance.png({ quality });
      }

      // Get the optimized buffer
      const optimizedBuffer = await sharpInstance.toBuffer();

      // Return the optimized image data
      return {
        buffer: optimizedBuffer,
        contentType: `image/${format}`,
        extension: format,
      };
    } catch (error) {
      console.error("Error optimizing image:", error);
      throw error;
    }
  }

  async uploadAsset(data: any) {
    try {
      const { file: originalFile, folderId = null } = data;

      if (!originalFile) {
        throw new Error("No file provided");
      }

      const fileId = crypto.randomUUID();
      let fileExtension =
        originalFile.name.split(".").pop()?.toLowerCase() || "";
      let fileName = originalFile.name;
      let fileType = originalFile.type;
      let file = originalFile;

      // Optimize image using the extracted function
      if (fileType.startsWith("image/")) {
        try {
          const buffer = await file.arrayBuffer();
          const {
            buffer: optimizedBuffer,
            contentType,
            extension,
          } = await this._optimizeImage(buffer);

          // Create new File object with optimized data
          file = new File(
            [optimizedBuffer],
            `${file.name.split(".")[0]}.${extension}`,
            { type: contentType }
          );

          // Update file metadata
          fileExtension = extension;
          fileType = contentType;
          fileName = `${originalFile.name.split(".")[0]}.${extension}`;
        } catch (error) {
          console.error("Error optimizing image:", error);
          // Continue with original file if optimization fails
        }
      }

      // Determine asset type
      const assetType = fileType.startsWith("image/") ? "image" : "video";

      // Create storage path
      const storagePath = `${this.appUuid}/${folderId ? folderId + "/" : ""}${fileName}`;

      // Generate and upload thumbnail if it's an image
      let thumbnailUrl = null;
      if (assetType === "image") {
        try {
          const buffer = await file.arrayBuffer();

          // Use the _optimizeImage function with thumbnail settings
          const { buffer: thumbnailBuffer } = await this._optimizeImage(
            buffer,
            {
              width: 300,
              height: 300,
              quality: 60,
              format: "webp",
            }
          );

          // Create thumbnail path
          const thumbnailName = `thumbnail_${fileName}`;
          const thumbnailPath = `${this.appUuid}/thumbnails/${thumbnailName}`;

          // Upload thumbnail
          const { error: thumbnailError } = await this.supabase.storage
            .from("dam-assets")
            .upload(thumbnailPath, thumbnailBuffer, {
              contentType: "image/webp",
              upsert: true,
            });

          if (!thumbnailError) {
            // Get thumbnail URL
            const {
              data: { publicUrl: thumbUrl },
            } = this.supabase.storage
              .from("dam-assets")
              .getPublicUrl(thumbnailPath);

            thumbnailUrl = thumbUrl;
          } else {
            console.error("Error uploading thumbnail:", thumbnailError);
          }
        } catch (error) {
          console.error("Error generating thumbnail:", error);
        }
      }

      // Upload file to Supabase Storage
      const buffer = await file.arrayBuffer();
      const { data: storageData, error: storageError } =
        await this.supabase.storage
          .from("dam-assets")
          .upload(storagePath, buffer, {
            contentType: fileType,
            upsert: true,
          });

      if (storageError) {
        console.log("storageError", storageError);
        throw new Error("Error 1 uploading asset: " + storageError.message);
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = this.supabase.storage.from("dam-assets").getPublicUrl(storagePath);

      // Prepare asset metadata
      let assetMetadata: any = {
        id: fileId,
        name: fileName,
        type: assetType,
        storagePath: storagePath,
        url: publicUrl,
        thumbnailUrl: thumbnailUrl || publicUrl, // Use the thumbnail URL if available, otherwise use the main URL
        size: file.size,
        format: fileExtension,
        folderId: folderId,
        app: this.appUuid,
        createdBy: this.chaiUser,
      };

      // Get additional metadata based on file type
      if (assetType === "image") {
        try {
          // Also extract image dimensions from the Sharp metadata
          const imageBuffer = Buffer.from(await file.arrayBuffer());
          const metadata = await sharp(imageBuffer).metadata();

          assetMetadata = {
            ...assetMetadata,
            width: metadata.width,
            height: metadata.height,
          };
        } catch (error) {
          console.error("Error extracting image metadata:", error);
        }
      } else if (assetType === "video") {
        // For videos, we'd ideally use a server-side service to extract metadata
        // For now, we'll just use minimal metadata
      }

      // Insert asset into database
      const { data: asset, error: insertError } = await this.supabase
        .from("assets")
        .insert(assetMetadata)
        .select()
        .single();

      if (insertError) {
        // Clean up storage if database insert fails
        await this.supabase.storage.from("dam-assets").remove([storagePath]);
        throw new Error(insertError.message);
      }

      // Format asset for frontend
      const formattedAsset = {
        id: asset.id,
        name: asset.name,
        altText: asset.altText,
        description: asset.description,
        type: asset.type,
        url: asset.url,
        thumbnailUrl: asset.thumbnailUrl,
        size: asset.size,
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
        format: asset.format,
        folderId: asset.folderId,
        tags: [],
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
      };

      return { asset: formattedAsset };
    } catch (error) {
      console.error("Error uploading asset:", error);
      throw error instanceof Error
        ? error
        : new Error("An unknown error occurred");
    }
  }

  async getAssets({
    query = "",
    type,
    folderId = null,
    page = 1,
    limit = 20,
    sortField = "created_at",
    sortOrder = "desc",
  }: {
    query?: string;
    type?: string;
    folderId?: string | null;
    page?: number;
    limit?: number;
    sortField?: string;
    sortOrder?: string;
  } = {}) {
    try {
      const offset = (page - 1) * limit;

      // Start building the query
      let assetsQuery = this.supabase
        .from("assets")
        .select("*, asset_tags(tag)");

      // Apply filters
      if (folderId) {
        assetsQuery = assetsQuery.eq("folderId", folderId);
      } else if (folderId === null) {
        assetsQuery = assetsQuery.is("folderId", null);
      }

      if (type && type !== "all") {
        assetsQuery = assetsQuery.eq("type", type);
      }

      if (query) {
        assetsQuery = assetsQuery.or(
          `name.ilike.%${query}%,description.ilike.%${query}%,altText.ilike.%${query}%,asset_tags.tag.ilike.%${query}%`
        );
      }

      // Get total count
      const { count: totalCount } = await this.supabase
        .from("assets")
        .select("*", { count: "exact", head: true });

      // Apply sorting
      const validSortFields = ["name", "size", "createdAt"];
      const validSortField = validSortFields.includes(sortField)
        ? sortField
        : "created_at";
      const validSortOrder = sortOrder === "asc" ? "asc" : "desc";

      assetsQuery = assetsQuery.order(validSortField, {
        ascending: validSortOrder === "asc",
      });

      // Apply pagination
      assetsQuery = assetsQuery.range(offset, offset + limit - 1);

      // Execute query
      const { data: assetsData, error: assetsError } = await assetsQuery;

      if (assetsError) {
        throw new Error(assetsError.message);
      }

      // Get folders
      const { data: foldersData, error: foldersError } = await this.supabase
        .from("folders")
        .select("*");

      if (foldersError) {
        throw new Error(foldersError.message);
      }

      // Format assets for frontend
      const assets = assetsData.map((asset: any) => {
        const tags = asset.asset_tags?.map((tag: any) => tag.tag) || [];
        return { ...asset, tags };
      });

      return {
        assets,
        folders: foldersData,
        total: totalCount,
        page,
        pageSize: limit,
      };
    } catch (error) {
      console.error("Error fetching assets:", error);
      throw error;
    }
  }
}
