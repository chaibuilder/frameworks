import { ChaiBuilderPages, ChaiBuilderPagesBackend } from "@chaibuilder/pages/server";
import type { APIContext } from "astro";
import { get, has } from "lodash";

const BYPASS_AUTH_CHECK_ACTIONS = ["LOGIN"];

export const builderApiHandler = (apiKey: string) => {
  const chaiBuilderPages = new ChaiBuilderPages(new ChaiBuilderPagesBackend(apiKey));
  return async (context: APIContext) => {
    try {
      const requestBody = await context.request.json();
      const checkAuth = !BYPASS_AUTH_CHECK_ACTIONS.includes(requestBody.action);
      // Check for `authorization` header
      const authorization = context.request.headers.get("authorization");
      if (checkAuth && !authorization) {
        return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Check and extract, valid token string `authorization`
      const authToken = (authorization ? authorization.split(" ")[1] : "") as string;
      const response = await chaiBuilderPages.handle(requestBody, authToken);

      if (has(response, "error")) {
        return new Response(JSON.stringify(response), {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        });
      }

      const tags = get(response, "tags", []);
      // Note: Astro doesn't have built-in cache revalidation like Next.js
      // You may need to implement your own cache invalidation strategy
      for (const tag of tags) {
        // TODO: Implement cache invalidation for Astro
        console.log(`Cache tag to invalidate: ${tag}`);
      }

      return new Response(JSON.stringify(response), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      // * On error, throw if firebase auth error, else 500
      if (error instanceof Error) {
        return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        return new Response(JSON.stringify({ error: "Something went wrong." }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
  };
};
