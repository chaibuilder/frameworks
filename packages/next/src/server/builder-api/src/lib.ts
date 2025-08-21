import { createHmac } from "crypto";

export const apiError = (code: string, error: unknown) => {
  console.error(error);
  return new Error(code);
};

export const getTemplate = (slugs: string[], url: string): string | null => {
  // First try exact match
  if (slugs.includes(url)) {
    return url;
  }

  // Then check for dynamic paths
  for (const slug of slugs) {
    // Convert :param segments to regex pattern
    const pattern = slug.replace(/:[\w-]+/g, "[\\w-]+");
    const regex = new RegExp(`^${pattern}$`);

    if (regex.test(url)) {
      return slug;
    }
  }

  return null;
};

export const decodedApiKey = (
  apiKey: string,
  secretKey: string
): {
  isValid: boolean;
  data?: { appId: string; timestamp: number };
} => {
  try {
    // Decode the base64 string
    const decoded = Buffer.from(apiKey, "base64").toString("utf-8");
    const [data, signature] = decoded.split(":");
    if (!data || !signature) return { isValid: false };

    // Verify the signature
    const expectedSignature = createHmac("sha256", secretKey)
      .update(data)
      .digest("base64url");

    if (signature !== expectedSignature) return { isValid: false };

    // Parse the data - now randomComponent is first
    const [, appId, timestamp] = data.split("#");
    if (!appId || !timestamp) return { isValid: false };

    return {
      isValid: true,
      data: {
        appId,
        timestamp: parseInt(timestamp, 36),
      },
    };
  } catch (error) {
    return { isValid: false };
  }
};
