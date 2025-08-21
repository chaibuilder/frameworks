import { ChaiBuilderPagesBackendInterface } from "@chaibuilder/pages/server";
import { getChaiAction } from "./builder-api/src/actions/actions-registery";
import { BaseAction } from "./builder-api/src/actions/base-action";
import { ChaiAssets } from "./builder-api/src/assets/class-chai-assets";
import { SupabaseChaiBuilderBackEnd } from "./builder-api/src/SupabaseChaiBuilderBackEnd";
import { ChaiBuilderUsers } from "./builder-api/src/users/ChaiBuilderUsers";
import { getSupabaseAdmin } from "./supabase";

export class ChaiBuilderSupabaseBackend implements ChaiBuilderPagesBackendInterface {
  private appId;
  constructor(appId: string) {
    this.appId = appId;
  }
  async handleUsersAction(body: any, userId?: string): Promise<any> {
    try {
      const supabase = await getSupabaseAdmin();
      const { action, data } = body;
      const users = new ChaiBuilderUsers(supabase, this.appId);

      if (action === "LOGIN") {
        const { email, password } = data as { email: string; password: string };
        const { data: userData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.log("error?.message", error?.message);
          return { error: error.message, status: 400 };
        }

        const appUser = await users.getAppUser(userData.user?.id as string);

        if (!appUser) {
          return {
            error: "This email is not registered with us. Please contact your administrator",
            status: 400,
          };
        }

        if (appUser.status !== "active") {
          return {
            error: "Your account is not active. Please contact your administrator to activate your account",
            status: 400,
          };
        }

        const response = {
          id: userData.user?.id,
          email: userData.user?.email,
          accessToken: userData.session?.access_token,
          refreshToken: userData.session?.refresh_token,
          expiresAt: userData.session?.expires_at,
          name: userData.user?.user_metadata?.name,
          avatar: userData.user?.user_metadata?.avatar,
        };

        return {
          ...response,
        };
      }

      if (action === "REFRESH_TOKEN") {
        const { error } = await supabase.auth.setSession({
          access_token: data.accessToken as string,
          refresh_token: data.refreshToken as string,
        });
        if (error) {
          return { error: error.message, status: 400 };
        }
        const { data: userData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
          return { error: refreshError.message, status: 401 };
        }
        return {
          id: userData.user?.id,
          email: userData.user?.email,
          accessToken: userData.session?.access_token,
          refreshToken: userData.session?.refresh_token,
          expiresAt: userData.session?.expires_at,
          name: userData.user?.user_metadata?.name,
          avatar: userData.user?.user_metadata?.avatar,
        };
      }

      if (action === "LOGOUT") {
        const { error } = await supabase.auth.signOut();
        if (error) {
          return { error: error.message, status: 401 };
        }
        return { message: "Logged out", status: 200 };
      }
      if (action === "GET_CHAI_USER") {
        const { data: userData, error } = await supabase.auth.admin.getUserById(data.userId as string);
        if (error) {
          return {
            id: "unknown",
            email: "unknown@chaibuilder.com",
            name: "Unknown",
            avatar: "",
          };
        }
        return {
          id: userData.user?.id,
          email: userData.user?.email,
          name: userData.user?.user_metadata?.name,
          avatar: userData.user?.user_metadata?.avatar,
        };
      }
      if (action === "GET_ROLE_AND_PERMISSIONS") {
        const { data: userData, error } = await supabase.auth.admin.getUserById(userId as string);
        return {
          id: userData.user?.id,
          email: userData.user?.email,
          role: "admin",
          permissions: null,
          status: 200,
        };
      }
      return { error: "Invalid action", status: 400 };
    } catch (error) {
      console.error("Error handling users action:", error);
      return { error: "Something went wrong.", status: 500 };
    }
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
        if (action === "GET_WEBSITE_PAGES") console.log("Response from backend:", action, response);
        if (response.status !== 200) {
          return { ...response.data, status: response.status };
        }
        return response.data;
      }
    } catch (error) {
      return { error: "Something went wrong.", status: 500 };
    }
  }
  async handleAssetsAction(body: any, userId: string): Promise<any> {
    try {
      const { action, data } = body;
      const backend = new ChaiAssets(this.appId, userId);
      let response = null;
      switch (action) {
        case "UPLOAD_ASSET":
          response = await backend.upload(data);
          break;
        case "GET_ASSET":
          response = await backend.getAsset(data);
          break;
        case "GET_ASSETS":
          response = await backend.getAssets(data);
          break;
        case "DELETE_ASSET":
          response = await backend.deleteAsset(data);
          break;
        case "UPDATE_ASSET":
          response = await backend.updateAsset(data);
          break;
        default:
          return { error: "INVALID ACTION", status: 400 };
      }

      if (response.status !== 200) {
        return { ...response, status: response.status };
      }
      return { ...response, status: response.status };
    } catch (error) {
      return { error, status: 500 };
    }
  }
}
