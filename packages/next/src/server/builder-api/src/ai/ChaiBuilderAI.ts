import { ChaiBlock } from "@chaibuilder/sdk";
import { apiError } from "../lib.js";
import { askAiForContent, askAiForStyles, AskAiResponse } from "./index.js";

export class ChaiBuilderAI {
  private model: string;
  private pageAiContext: string = "";

  constructor() {
    this.model = `deepseek/deepseek-v3.1`;
  }

  set(key: "pageAiContext", value: string) {
    this[key] = value;
  }

  get(key: "pageAiContext", defaultValue?: string) {
    return this[key] || defaultValue;
  }

  async askAi({
    type,
    prompt,
    blocks,
    lang,
    context = "",
  }: {
    type: "styles" | "content";
    prompt: string;
    blocks: Partial<ChaiBlock>[];
    lang: string;
    context?: string;
  }): Promise<AskAiResponse> {
    if (!this.model) {
      throw apiError("Something went wrong. Please contact support.", new Error("Please contact support."));
    }
    return type === "content"
      ? askAiForContent(
          {
            prompt,
            blocks,
            lang,
            context,
          },
          this.model,
        )
      : askAiForStyles({ prompt, blocks }, this.model);
  }
}
