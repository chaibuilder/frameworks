import { streamText } from "ai";
import { get, noop } from "lodash";
import { getSupabaseAdmin } from "./supabase";
import { getAskAiSystemPrompt } from "./system-prompt";

export class ChaiFrameworkAIChatHandler implements ChaiFrameworkAIChatHandler {
  private model: string = "google/gemini-2.5-flash";
  private temperature: number = 0.7;
  private authTokenOrUserId: string;
  private startTime: number;

  constructor(
    private options?: {
      model?: string;
      authTokenOrUserId: string;
      onFinish?: () => void;
      onError?: (error: Error) => void;
    },
  ) {
    this.startTime = 0;
    this.model = options?.model ?? this.model;
    this.authTokenOrUserId = options?.authTokenOrUserId as string;
  }

  async handleRequest(options: any) {
    const { messages, image, initiator = null } = options;

    // Validate messages
    if (!messages || !Array.isArray(messages)) {
      throw new Error("Messages are required and must be an array");
    }

    // Get the user messages (excluding system)
    const userMessages = messages.filter((m: any) => m.role !== "system");
    const lastUserMessage = userMessages[userMessages.length - 1];

    const aiMessages = image
      ? [
          ...userMessages.slice(0, -1),
          {
            role: "user",
            content: [
              {
                type: "text",
                text: lastUserMessage.content,
              },
              {
                type: "image",
                image: image,
              },
            ],
          },
        ]
      : messages;

    this.startTime = new Date().getTime();
    const result = streamText({
      model: this.model,
      system: getAskAiSystemPrompt(initiator),
      messages: aiMessages,
      temperature: this.temperature,
      onFinish: (arg) => this.logAiRequest(this.authTokenOrUserId, this.startTime, arg),
      onError: ({ error }) => this.logAiRequestError(this.authTokenOrUserId, this.startTime, error) ?? noop,
    });

    return result;
  }

  async logAiRequestError(authTokenOrUserId: string, startTime: number, error: any) {
    const supabase = await getSupabaseAdmin();
    const supabaseUser = await supabase.auth.getUser(authTokenOrUserId);
    if (supabaseUser.error) return;

    const errorStr = String(error);

    const totalDuration = startTime > 0 ? new Date().getTime() - startTime : 0;
    const payload = {
      model: this.model,
      totalDuration,
      error: errorStr,
      totalTokens: {},
      tokenUsage: 0,
      cost: 0,
      prompt: "",
      user: supabaseUser?.data?.user?.id,
      client: process?.env?.CHAIBUILDER_CLIENT_ID || "",
    };

    await supabase.from("ai_logs").insert(payload);
  }

  async logAiRequest(authTokenOrUserId: string, startTime: number, arg: any) {
    const supabase = await getSupabaseAdmin();
    const supabaseUser = await supabase.auth.getUser(authTokenOrUserId);
    if (supabaseUser.error) return;

    const totalUsage = arg?.totalUsage;
    const cost = arg?.providerMetadata?.gateway?.cost;
    const providerAttempts = get(arg, "providerMetadata.gateway.routing.modelAttempts.[0].providerAttempts.[0]", {});
    const model = get(providerAttempts, "providerApiModelId");
    const totalDuration = startTime > 0 ? Math.floor((new Date().getTime() - startTime) / 1000) : 0;

    const payload = {
      model,
      totalDuration,
      error: null,
      totalTokens: totalUsage?.totalTokens,
      tokenUsage: totalUsage,
      cost,
      prompt: "",
      user: supabaseUser?.data?.user?.id,
      client: process?.env?.CHAIBUILDER_CLIENT_ID || "",
    };

    await supabase.from("ai_logs").insert(payload);
  }

  isConfigured(): boolean {
    return true;
  }
}
