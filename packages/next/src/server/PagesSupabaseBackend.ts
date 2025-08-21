import { ChaiBuilderPagesBackendInterface } from "@chaibuilder/pages/server";
import { getChaiAction } from "./builder-api/src/actions/actions-registery";
import { BaseAction } from "./builder-api/src/actions/base-action";
import { SupabaseChaiBuilderBackEnd } from "./builder-api/src/SupabaseChaiBuilderBackEnd";
import { getSupabaseAdmin } from "./supabase";

export class ChaiBuilderSupabaseBackend implements ChaiBuilderPagesBackendInterface {
  private appId;
  constructor(appId: string) {
    this.appId = appId;
  }
  async handleUsersAction(body: any, userId: string): Promise<any> {
    return Promise.reject(new Error("Not implemented"));
  }
  async handleAction(body: { action: string; data: Record<string, unknown> }, userId: string): Promise<unknown> {
    try {
      const { action, data } = body;
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
            status: 400,
          };
        }

        // If action is registered in the new system, use it
        // Set the context on the action handler
        actionHandler.setContext({ appId: this.appId, userId });
        // Execute the action
        const result = await actionHandler.execute(data);
        return result;
      } else {
        const supabase = await getSupabaseAdmin();
        // Fallback to the original implementation if action not found in registry
        const backend = new SupabaseChaiBuilderBackEnd(supabase, this.appId, userId ?? "");
        const response = await backend.handle({ action, data } as any);

        if (response.status !== 200) {
          return { ...response.data, status: response.status };
        }
        return { ...response.data, status: response.status };
      }
    } catch (error) {
      console.error("Error handling builder API:", error);
      return { error: "Something went wrong.", status: 500 };
    }
  }
  async handleAssetsAction(body: any, userId: string): Promise<any> {
    return Promise.reject(new Error("Not implemented"));
  }
}
