import { NextResponse } from "next/server";
import { ActionError } from "./builder-api/src/actions/action-error";
import { getChaiAction } from "./builder-api/src/actions/actions-registery";
import { ChaiBaseAction } from "./builder-api/src/actions/base-action";

export const chaiBuilderActionHandler = (params: { apiKey: string; userId: string }) => {
  return async (actionData: { action: string; data?: unknown }) => {
    const { apiKey, userId } = params;
    try {
      const requestBody = actionData;
      // Check for `authorization` header
      let response = null;
      // if (requestBody.action === "ASK_AI") {
      //   const startTime = new Date().getTime();
      //   const ai = new ChaiAIChatHandler({
      //     // @ts-ignore
      //     onFinish: (arg: any) => {
      //       try {
      //         logAiRequest({
      //           arg,
      //           prompt: requestBody.data.messages[requestBody.data.messages.length - 1].content,
      //           userId,
      //           model: requestBody.data.model,
      //           startTime,
      //         });
      //       } catch (e) {
      //         console.error("Error logging AI request:", e);
      //       }
      //     },
      //     onError: (error) => {
      //       try {
      //         logAiRequestError({
      //           error,
      //           userId,
      //           startTime: startTime,
      //           model: requestBody.data.model,
      //           prompt: requestBody.data.messages[requestBody.data.messages.length - 1].content,
      //         });
      //       } catch (e) {
      //         console.error("Error logging AI request error:", e);
      //       }
      //     },
      //   });
      //   return await handleAskAiRequest(ai, requestBody.data);
      // } else {
      const { action, data } = requestBody;
      // Get the action handler from the registry
      const actionHandler = getChaiAction(action);
      if (!actionHandler) {
        return {
          error: `Action ${action} not found`,
          code: "ACTION_NOT_FOUND",
          status: 404,
        };
      }
      // Validate the data first
      if (!actionHandler.validate(data)) {
        // For BaseAction implementations, we can get detailed validation errors
        const errorMessages = (actionHandler as ChaiBaseAction).getValidationErrors(data);
        return {
          error: `Validation failed: ${errorMessages}`,
          code: "INVALID_REQUEST_DATA",
          status: 400,
        };
      }
      // If action is registered in the new system, use it
      // Set the context on the action handler
      actionHandler.setContext({ appId: apiKey, userId });
      // Execute the action
      return await actionHandler.execute(data);
      // }
    } catch (error) {
      console.log("Error in builderApiHandler:", error);

      // Handle ActionError with specific error code and message
      if (error instanceof ActionError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
      }

      // Generic error fallback
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
  };
};
