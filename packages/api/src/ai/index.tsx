import { ChaiBlock } from "@chaibuilder/sdk";
import { generateObject, generateText, LanguageModel } from "ai";
import { map } from "lodash";
import { z } from "zod";
import { apiError } from "../lib.ts";
import { extractBlocksFromText } from "./lib.ts";

export type AskAiResponse = {
  blocks?: Array<{ _id: string } & Partial<ChaiBlock>>;
  usage?: Record<string, number>;
  error?: string;
};

export const askAiForStyles = async (
  args: {
    prompt: string;
    blocks: Partial<ChaiBlock>[];
  },
  model: LanguageModel
): Promise<AskAiResponse> => {
  try {
    const { object, usage } = await generateObject({
      model,
      schema: z.object({
        blocks: z.array(
          z.object({ _id: z.string(), classes: z.string(), key: z.string() })
        ),
      }),
      system: `You are a UI developer who writes tailwind css.
      Instructions: Analyze the provided blocks and update their classes based on the user's prompt.
      Make sure to add responsive classes wherever required.
      Return the same block with updated classes.
      Do not add any other properties. Return the same properties as in the input.
      Number of input blocks and output blocks MUST be the same.
      IMPORTANT: Your response must be valid JSON.`,
      prompt: `Update the styles based on this prompt: ${args.prompt}
              Blocks to update: ${JSON.stringify(args.blocks)}`,
    });
    if (
      Array.isArray(object.blocks) &&
      object.blocks.every((block: { _id: string }) => block._id)
    ) {
      const updatedBlocks = map(object.blocks, (block) => ({
        _id: block._id,
        [block.key]: block.classes,
      }));
      // @ts-ignore
      return { blocks: updatedBlocks };
    }
    return { error: "Something went wrong. Please try again." };
  } catch (e: unknown) {
    return { error: (e as Error).message };
  }
};

export const askAiForContent = async (
  args: {
    prompt: string;
    blocks: Partial<ChaiBlock>[];
    lang: string;
    context?: string;
  },
  model: LanguageModel
): Promise<AskAiResponse> => {
  try {
    const { text, finishReason } = await generateText({
      model,
      system: `You are a website content editor.
      ${args.context ? `Context: ${args.context}` : ""}
      Instructions: Analyze the provided blocks and update their content based on the user's prompt.
      Maintain the same structure and only update text content in properties except _type, _parent and _id.
      All other properties MUST be updated. Try to maintain approximate same length of text as original.
      Understand the context for each block by checking the _type value and _parent block.
      Return JSON array with _id and updated content properties.
      IMPORTANT: Your response must be valid JSON.`,
      prompt: `Update the content based on this prompt: ${args.prompt}
              Blocks to update: ${JSON.stringify(args.blocks)}`,
    });
    if (finishReason !== "stop") {
      throw apiError(
        "Something went wrong. Please contact support.",
        new Error("Please contact support.")
      );
    }
    const blocks: Array<{ _id: string } & Partial<ChaiBlock>> =
      extractBlocksFromText(text, args.lang);
    // check if blocks is an array and each block has _id
    if (Array.isArray(blocks) && blocks.every((block) => block._id)) {
      return { blocks };
    }
    return { error: "Something went wrong. Please try again." };
  } catch (e: unknown) {
    return { error: (e as Error).message };
  }
};
