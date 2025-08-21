import { createOpenAI } from "@ai-sdk/openai";
import { ChaiBlock } from "@chaibuilder/sdk";
import { apiError } from "../lib.js";
import { askAiForContent, askAiForStyles, AskAiResponse } from "./index.js";

export class ChaiBuilderAI {
  private apiKey: string;
  private model?: any;
  private pageAiContext: string = "";

  constructor(apiKey: string, model: string = "gpt-4o-mini") {
    this.apiKey = apiKey;

    if (!apiKey) {
      return;
    }

    const openai = createOpenAI({ apiKey: this.apiKey });
    this.model = openai(model);
  }

  set(key: "apiKey" | "pageAiContext", value: string) {
    this[key] = value;
  }

  get(key: "pageAiContext", defaultValue?: string) {
    return this[key] || defaultValue;
  }

  setModel(model: string) {
    const openai = createOpenAI({ apiKey: this.apiKey });
    this.model = openai(model);
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
