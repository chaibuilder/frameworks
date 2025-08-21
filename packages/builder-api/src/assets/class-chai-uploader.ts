import { SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";

interface AssetUploaderArgs {
  file: Base64URLString;
  folderId?: string | null;
  name: string;
  optimize?: boolean;
}
// Type definition for Base64URLString
type Base64URLString = string;
export type AssetUploadResponse = {
  url: string;
  thumbnailUrl?: string;
  size?: number;
  width?: number;
  height?: number;
  mimeType: string;
};

const BUCKET_NAME = "dam-assets";

export interface AssetUploaderInterface {
  upload(args: AssetUploaderArgs): Promise<AssetUploadResponse>;
}

export class SupabaseStorageUploader implements AssetUploaderInterface {
  constructor(
    private supabase: SupabaseClient,
    private appId: string
  ) {}

  async upload({
    file,
    folderId,
    name,
    optimize = true,
  }: AssetUploaderArgs): Promise<AssetUploadResponse> {
    try {
      const buffer = this.getBufferFromBase64(file);

      // Validate file is an image
      await this.validateIsImage(buffer);

      const imageInfo = await sharp(buffer).metadata();

      // Process main image and thumbnail
      const { optimizedBuffer, optimizedInfo } = await this.optimizeImage(
        buffer,
        imageInfo,
        optimize
      );
      const thumbnailBuffer = await this.createThumbnail(buffer);

      // Upload to Supabase Storage
      const { url, thumbnailUrl } = await this.uploadToSupabase(
        optimizedBuffer,
        thumbnailBuffer,
        name,
        folderId
      );

      return {
        url,
        thumbnailUrl,
        size: optimizedInfo.size,
        width: optimizedInfo.width,
        height: optimizedInfo.height,
        mimeType: "image/webp",
      };
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  }

  private async validateIsImage(buffer: Buffer): Promise<void> {
    try {
      const metadata = await sharp(buffer).metadata();

      const validImageFormats = [
        "jpeg",
        "jpg",
        "png",
        "webp",
        "gif",
        "svg",
        "tiff",
      ];
      if (
        !metadata.format ||
        !validImageFormats.includes(metadata.format.toLowerCase())
      ) {
        throw new Error(
          `Invalid image format: ${metadata.format || "unknown"}`
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`File validation failed: ${error.message}`);
      }
      throw new Error("File is not a valid image");
    }
  }

  private getBufferFromBase64(base64String: string): Buffer {
    try {
      const base64Data = base64String.split(",")[1] || base64String;
      return Buffer.from(base64Data, "base64");
    } catch {
      throw new Error("Invalid base64 string format");
    }
  }

  private async optimizeImage(
    buffer: Buffer,
    imageInfo: sharp.Metadata,
    optimize = true
  ): Promise<{
    optimizedBuffer: Buffer;
    optimizedInfo: sharp.Metadata;
  }> {
    // First optimization attempt with standard settings
    const optimizedBuffer = optimize
      ? await sharp(buffer)
          .webp({ quality: 80 })
          .resize({ width: Math.min(imageInfo.width || 1200, 1200) })
          .toBuffer()
      : buffer;

    // Get metadata from optimized image
    const optimizedInfo = await sharp(optimizedBuffer).metadata();

    // If still too large, further optimize
    if (optimize && optimizedBuffer.length > 100 * 1024) {
      return await this.furtherOptimizeImage(
        buffer,
        imageInfo,
        optimizedBuffer.length
      );
    }

    return { optimizedBuffer, optimizedInfo };
  }

  private async furtherOptimizeImage(
    buffer: Buffer,
    imageInfo: sharp.Metadata,
    currentSize: number
  ): Promise<{
    optimizedBuffer: Buffer;
    optimizedInfo: sharp.Metadata;
  }> {
    // Calculate necessary compression level to get under 100kb
    const compressionLevel = Math.floor(70 * ((100 * 1024) / currentSize));

    // Further optimize with adjusted quality
    const furtherOptimizedBuffer = await sharp(buffer)
      .webp({ quality: compressionLevel })
      .resize({ width: Math.min(imageInfo.width || 1200, 1200) })
      .toBuffer();

    // Get metadata from further optimized image
    const optimizedInfo = await sharp(furtherOptimizedBuffer).metadata();

    return {
      optimizedBuffer: furtherOptimizedBuffer,
      optimizedInfo,
    };
  }

  private async createThumbnail(buffer: Buffer): Promise<Buffer> {
    return await sharp(buffer)
      .webp({ quality: 70 })
      .resize({ width: 300 })
      .toBuffer();
  }

  private async uploadToSupabase(
    optimizedBuffer: Buffer,
    thumbnailBuffer: Buffer,
    name: string,
    folderId?: string | null
  ): Promise<{ url: string; thumbnailUrl: string }> {
    const originalFileName = name;
    const fileName = `${originalFileName}`;
    const thumbnailName = `${originalFileName}_thumbnail.webp`;

    const baseFolder = this.appId;
    const folderPath = folderId ? `${baseFolder}/${folderId}` : baseFolder;
    const filePath = `${folderPath}/${fileName}`;
    const thumbnailPath = `${folderPath}/${thumbnailName}`;

    try {
      // Upload main image
      const { data: fileData, error: fileError } = await this.supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, optimizedBuffer, {
          contentType: "image/webp",
          upsert: true,
        });

      if (fileError) throw fileError;

      // Upload thumbnail
      const { data: thumbnailData, error: thumbnailError } =
        await this.supabase.storage
          .from(BUCKET_NAME)
          .upload(thumbnailPath, thumbnailBuffer, {
            contentType: "image/webp",
            upsert: true,
          });

      if (thumbnailError) throw thumbnailError;

      // Get public URLs
      const {
        data: { publicUrl: url },
      } = this.supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

      const {
        data: { publicUrl: thumbnailUrl },
      } = this.supabase.storage.from(BUCKET_NAME).getPublicUrl(thumbnailPath);

      return { url, thumbnailUrl };
    } catch (error) {
      console.error("Supabase upload error:", error);
      throw new Error(
        `Failed to upload to Supabase: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}
