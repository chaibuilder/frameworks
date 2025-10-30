import { ChaiBuilderPages } from "@chaibuilder/pages/server";
import { get, has, isEmpty } from "lodash";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ChaiBuilder } from "./chai-builder";
import { ChaiFrameworkAIChatHandler } from "./class-ai-handler";
import { ChaiBuilderSupabaseBackend } from "./PagesSupabaseBackend";
import { getSupabaseAdmin } from "./supabase";

const BYPASS_AUTH_CHECK_ACTIONS = ["LOGIN"];

const getAppUuidFromRoute = async (req: NextRequest): Promise<string> => {
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

const logAiRequest = ({ totalUsage }: any) => {
  console.log("Ai Request total usage: ", totalUsage);
};

async function handleAskAiRequest(ai: ChaiFrameworkAIChatHandler, requestBody: any): Promise<NextResponse> {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await ai.handleRequest(requestBody.data);

        if (!result?.textStream) {
          controller.enqueue(encoder.encode("Error: No streaming response available"));
          controller.close();
          return;
        }

        // Stream the AI response chunks
        for await (const chunk of result.textStream) {
          if (chunk) {
            controller.enqueue(encoder.encode(chunk));
          }
        }

        controller.close();
      } catch (error) {
        controller.enqueue(encoder.encode(`Error: ${error instanceof Error ? error.message : "Unknown error"}`));
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

export const builderApiHandler = (apiKey?: string) => {
  return async (req: NextRequest, response: NextResponse) => {
    try {
      const USE_CHAI_API_SERVER = !isEmpty(apiKey);
      const apiKeyToUse = USE_CHAI_API_SERVER ? (apiKey as string) : await getAppUuidFromRoute(req);
      const backend = new ChaiBuilderSupabaseBackend(apiKeyToUse);
      ChaiBuilder.setSiteId(apiKeyToUse);
      // register global data providers
      //@ts-expect-error
      const ai = new ChaiFrameworkAIChatHandler({ onFinish: logAiRequest });
      const chaiBuilderPages = new ChaiBuilderPages({ backend, ai });
      const requestBody = await req.json();
      const checkAuth = !BYPASS_AUTH_CHECK_ACTIONS.includes(requestBody.action);
      // Check for `authorization` header
      const authorization = req.headers.get("authorization");
      if (checkAuth && !authorization) {
        return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
      }
      let authTokenOrUserId = (authorization ? authorization.split(" ")[1] : "") as string;
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
        return await handleAskAiRequest(ai, requestBody);
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
        revalidateTag(tag);
      }
      return NextResponse.json(response);
    } catch (error) {
      console.log("AI Error", error);
      // * On error, throw if firebase auth error, else 500
      if (error instanceof Error) {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
      } else {
        return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
      }
    }
  };
};
