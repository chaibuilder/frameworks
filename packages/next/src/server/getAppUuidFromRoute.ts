import { NextRequest } from "next/server";

export const getAppUuidFromRoute = async (req: NextRequest): Promise<string> => {
  // Extract UUID from route format: [uuid]/builder/api
  const url = new URL(req.url);
  const pathSegments = url.pathname.split("/").filter((segment) => segment !== "");

  // Find the index of 'builder' in the path segments
  const builderIndex = pathSegments.findIndex((segment) => segment === "builder");

  if (pathSegments.length > 0) {
    // The UUID should be the segment before 'builder'
    const uuid = pathSegments[0];
    if (uuid) {
      return uuid;
    }
  }

  // Fallback: throw an error if UUID cannot be extracted
  throw new Error("Unable to extract app UUID from route");
};
