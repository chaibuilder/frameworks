import { supabase } from "@/app/supabase";
import { NextRequest, NextResponse } from "next/server";
import { ActionError } from "./actions/action-error";
import { getChaiAction } from "./actions/actions-registery";
import { BaseAction } from "./actions/base-action";
import { decodedApiKey } from "./lib";
import { SupabaseChaiBuilderBackEnd } from "./SupabaseChaiBuilderBackEnd";

export const maxDuration = 30;

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? "";

const NON_AUTH_TOKEN_LIST = ["GET_PAGE", "GET_PAGE_META", "GET_LINK", "GET_WEBSITE_SETTINGS", "GET_REVISION_PAGE"];

export async function handleBuilderApi(req: NextRequest) {
  const upload = req.headers.get("x-chai-upload");
  const formData = upload ? await req.formData() : await req.json();

  // get appuuid from headers
  const apiKey = req.headers.get("x-chai-api-key");

  if (!apiKey) {
    return NextResponse.json({ error: "API KEY IS REQUIRED" }, { status: 400 });
  }
  const appId = decodedApiKey(apiKey, ENCRYPTION_KEY).data?.appId;

  if (!appId) {
    return NextResponse.json({ error: "INVALID API KEY" }, { status: 400 });
  }

  const action = formData.action;
  let userId = "";

  // Check if authentication is required for this action
  if (!NON_AUTH_TOKEN_LIST.includes(action)) {
    const token = req.headers.get("x-chai-auth-token");
    if (!token) {
      return NextResponse.json({ error: "TOKEN IS REQUIRED" }, { status: 401 });
    }
    const user = await supabase.auth.getUser(token);
    if (user.error) {
      return NextResponse.json({ error: "INVALID TOKEN" }, { status: 401 });
    }
    userId = user.data.user?.id || "";
  }

  // Parse the request data
  const data = upload
    ? {
        file: formData.get("file") as File,
        folderId: formData.get("folderId"),
      }
    : formData.data || {};

  try {
    // Get the action handler from the registry
    const actionHandler = getChaiAction(action);

    if (actionHandler) {
      // Validate the data first
      if (!actionHandler.validate(data)) {
        // For BaseAction implementations, we can get detailed validation errors
        const errorMessages = (actionHandler as BaseAction).getValidationErrors(data);
        return NextResponse.json(
          {
            error: `Validation failed: ${errorMessages}`,
            code: "INVALID_REQUEST_DATA",
          },
          { status: 400 },
        );
      }

      // If action is registered in the new system, use it
      // Set the context on the action handler
      actionHandler.setContext({ appId, userId });
      // Execute the action
      const result = await actionHandler.execute(data);
      return NextResponse.json(result, { status: 200 });
    } else {
      // Fallback to the original implementation if action not found in registry
      const backend = new SupabaseChaiBuilderBackEnd(supabase, appId, userId ?? "");
      const response = await backend.handle({ action, data } as any);

      if (response.status !== 200) {
        return NextResponse.json(response.data, { status: response.status });
      }
      return NextResponse.json(response.data, { status: response.status });
    }
  } catch (error) {
    console.error(`Error executing action '${action}':`, error);

    // Handle ActionError specifically
    if (error instanceof ActionError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }

    // Handle other errors
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
