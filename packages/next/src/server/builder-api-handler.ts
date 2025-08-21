import { ChaiBuilderPages, ChaiBuilderPagesBackend } from "@chaibuilder/pages/server";
import { get, has, isEmpty } from "lodash";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ChaiBuilderSupabaseBackend } from "./PagesSupabaseBackend";
import { getSupabaseAdmin } from "./supabase";

const BYPASS_AUTH_CHECK_ACTIONS = ["LOGIN"];

const getAppUuidFromRoute = async (req: NextRequest) => {
  // This function should implement the logic to retrieve the app UUID from the route.
  // For example, it could extract it from the request URL or headers.
  // Placeholder implementation:
  return "70edd9d5-8026-4d3c-b902-fd3bb32cdaef"; //process.env.CHAIBUILDER_API_KEY!; // Replace with actual logic to get app UUID
};

export const builderApiHandler = (apiKey?: string) => {
  return async (req: NextRequest) => {
    const USE_CHAI_API_SERVER = !isEmpty(apiKey);
    const apiKeyToUse = USE_CHAI_API_SERVER ? (apiKey as string) : await getAppUuidFromRoute(req);
    const backend = apiKey ? new ChaiBuilderPagesBackend(apiKeyToUse) : new ChaiBuilderSupabaseBackend(apiKeyToUse);
    const chaiBuilderPages = new ChaiBuilderPages(backend);
    try {
      const requestBody = await req.json();
      const checkAuth = !BYPASS_AUTH_CHECK_ACTIONS.includes(requestBody.action);
      // Check for `authorization` header
      const authorization = req.headers.get("authorization");
      if (checkAuth && !authorization) {
        return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
      }
      let authTokenOrUserId = (authorization ? authorization.split(" ")[1] : "") as string;
      if (checkAuth && !USE_CHAI_API_SERVER) {
        const supabase = await getSupabaseAdmin();
        const supabaseUser = await supabase.auth.getUser(authTokenOrUserId);
        if (supabaseUser.error) {
          // If the token is invalid or expired, return a 401 response
          return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
        }
        authTokenOrUserId = supabaseUser.data.user?.id || "";
      }

      const response = await chaiBuilderPages.handle(requestBody, authTokenOrUserId);

      if (has(response, "error")) {
        return NextResponse.json(response, { status: response.status });
      }

      const tags = get(response, "tags", []);
      for (const tag of tags) {
        revalidateTag(tag);
      }
      return NextResponse.json(response);
    } catch (error) {
      // * On error, throw if firebase auth error, else 500
      if (error instanceof Error) {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
      } else {
        return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
      }
    }
  };
};
