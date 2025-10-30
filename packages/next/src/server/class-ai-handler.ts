import { streamText } from "ai";
import { noop } from "lodash";
import { getAskAiSystemPrompt } from "./system-prompt";

export class ChaiFrameworkAIChatHandler implements ChaiFrameworkAIChatHandler {
  private model: string = "google/gemini-2.5-flash";
  private temperature: number = 0.7;

  constructor(private options?: { model?: string; onFinish?: () => void; onError?: (error: Error) => void }) {
    this.model = options?.model ?? this.model;
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

    const result = streamText({
      model: this.model,
      system: getAskAiSystemPrompt(initiator),
      messages: aiMessages,
      temperature: this.temperature,
      onFinish: this.options?.onFinish ?? noop,
      onError: this.options?.onError ?? noop,
    });

    return result;
  }

  isConfigured(): boolean {
    return true;
  }
}
