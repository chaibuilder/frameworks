import { getChaiAction } from "./actions/actions-registery";
import { ActionError } from "./actions/action-error";
import { BaseAction } from "./actions/base-action";
import { decodedApiKey } from "./lib";
import { SupabaseChaiBuilderBackEnd } from "./SupabaseChaiBuilderBackEnd";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? "";

const NON_AUTH_TOKEN_LIST = ["GET_PAGE", "GET_PAGE_META", "GET_LINK", "GET_WEBSITE_SETTINGS", "GET_REVISION_PAGE"];

export async function handleBuilderApi(req) {
  const formData = await req.json();
  // get appuuid from headers
  const apiKey = req.headers.get("x-chai-api-key");
  const appId = decodedApiKey(apiKey, ENCRYPTION_KEY).data?.appId;

  if (!appId) {
    return { error: "INVALID API KEY", status: 400 };
  }

  const action = formData.action;
  let userId = "";

  // Check if authentication is required for this action
  if (!NON_AUTH_TOKEN_LIST.includes(action)) {
    const token = req.headers.get("x-chai-auth-token");
    if (!token) {
      return { error: "TOKEN IS REQUIRED", status: 401 };
    }
    const user = await supabase.auth.getUser(token);
    if (user.error) {
      return { error: "INVALID TOKEN", status: 401 };
    }
    userId = user.data.user?.id || "";
  }

  // Parse the request data
  const data = formData.data || {};

  try {
    // Get the action handler from the registry
    const actionHandler = getChaiAction(action);

    if (actionHandler) {
      // Validate the data first
      if (!actionHandler.validate(data)) {
        // For BaseAction implementations, we can get detailed validation errors
        const errorMessages = (actionHandler as BaseAction).getValidationErrors(data);
        return {
          error: `Validation failed: ${errorMessages}`,
          code: "INVALID_REQUEST_DATA",
        };
      }

      // If action is registered in the new system, use it
      // Set the context on the action handler
      actionHandler.setContext({ appId, userId });
      // Execute the action
      const result = await actionHandler.execute(data);
      return result;
    } else {
      // Fallback to the original implementation if action not found in registry
      const backend = new SupabaseChaiBuilderBackEnd(supabase, appId, userId ?? "");
      const response = await backend.handle({ action, data } as any);

      if (response.status !== 200) {
        return response.data;
      }
      return response.data;
    }
  } catch (error) {
    console.error("Error handling builder API:", error);
    
    // Handle ActionError with specific error code and message
    if (error instanceof ActionError) {
      return {
        error: error.message,
        code: error.code,
        status: 400,
      };
    }
    
    // Generic error fallback
    return { error: "INTERNAL_SERVER_ERROR", status: 500 };
  }
}
