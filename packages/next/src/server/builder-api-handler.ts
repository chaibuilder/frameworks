import { ChaiAIChatHandler, ChaiBuilderPages } from "@chaibuilder/pages/server";
import { get, has, isEmpty } from "lodash";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ActionError } from "./builder-api/src/actions/action-error";
import { ChaiBuilder } from "./chai-builder";
import { getAppUuidFromRoute } from "./getAppUuidFromRoute";
import { handleAskAiRequest } from "./handleAskAiRequest";
import { logAiRequest, logAiRequestError } from "./log-ai-request";
import { ChaiBuilderSupabaseBackend } from "./PagesSupabaseBackend";
import { getSupabaseAdmin } from "./supabase";

const BYPASS_AUTH_CHECK_ACTIONS = ["LOGIN"];

export const builderApiHandler = (apiKey?: string) => {
  return async (req: NextRequest) => {
    try {
      const USE_CHAI_API_SERVER = !isEmpty(apiKey);
      const apiKeyToUse = USE_CHAI_API_SERVER ? (apiKey as string) : await getAppUuidFromRoute(req);
      const backend = new ChaiBuilderSupabaseBackend(apiKeyToUse);
      ChaiBuilder.setSiteId(apiKeyToUse);
      // register global data providers
      const authorization = req.headers.get("authorization");
      let authTokenOrUserId = (authorization ? authorization.split(" ")[1] : "") as string;

      const chaiBuilderPages = new ChaiBuilderPages({ backend });
      const requestBody = await req.json();
      const checkAuth = !BYPASS_AUTH_CHECK_ACTIONS.includes(requestBody.action);
      // Check for `authorization` header
      if (checkAuth && !authorization) {
        return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
      }
      if (checkAuth) {
        const supabase = await getSupabaseAdmin();
        const supabaseUser = await supabase.auth.getUser(authTokenOrUserId);
        if (supabaseUser.error) {
          // If the token is invalid or expired, return a 401 response
          return NextResponse.json({ error: "Invalid or expired token sss" }, { status: 401 });
        }
        authTokenOrUserId = supabaseUser.data.user?.id || "";
      }

      let response = null;
      if (requestBody.action === "ASK_AI") {
        const startTime = new Date().getTime();
        const ai = new ChaiAIChatHandler({
          // @ts-ignore
          onFinish: (arg: any) => {
            try {
              logAiRequest({
                arg,
                prompt: requestBody.data.messages[requestBody.data.messages.length - 1].content,
                userId: authTokenOrUserId,
                model: requestBody.data.model,
                startTime,
              });
            } catch (e) {
              console.error("Error logging AI request:", e);
            }
          },
          onError: (error) => {
            try {
              logAiRequestError({
                error,
                userId: authTokenOrUserId,
                startTime: startTime,
                model: requestBody.data.model,
                prompt: requestBody.data.messages[requestBody.data.messages.length - 1].content,
              });
            } catch (e) {
              console.error("Error logging AI request error:", e);
            }
          },
        });
        return await handleAskAiRequest(ai, requestBody.data);
      } else {
        response = await chaiBuilderPages.handle(requestBody, authTokenOrUserId, {} as any);
      }

      if (has(response, "error")) {
        return NextResponse.json(response, { status: response.status });
      }

      const tags = get(response, "tags", []);
      if (tags.length > 0) {
        console.log("Site Id", apiKeyToUse);
        console.log("Revalidating tags", tags);
      }
      for (const tag of tags) {
        revalidateTag(tag, "max");
      }
      return NextResponse.json(response);
    } catch (error) {
      console.log("Error in builderApiHandler:", error);
      
      // Handle ActionError with specific error code and message
      if (error instanceof ActionError) {
        return NextResponse.json(
          {
            error: error.message,
            code: error.code,
          },
          { status: 400 }
        );
      }
      
      // Generic error fallback
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
  };
};
