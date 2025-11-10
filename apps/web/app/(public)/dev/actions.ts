"use server";

import { ChaiAiPageGenerator } from "chai-next/server";

export async function enhancePromptAction(prompt: string) {
  try {
    if (!prompt || prompt.trim().length === 0) {
      return {
        success: false,
        error: "Prompt cannot be empty",
      };
    }

    const generator = new ChaiAiPageGenerator();
    const enhancedPrompt = await generator.enhancePrompt(prompt);

    return {
      success: true,
      enhancedPrompt,
    };
  } catch (error) {
    console.error("Error enhancing prompt:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to enhance prompt",
    };
  }
}

export async function generatePageAction(prompt: string) {
  try {
    if (!prompt || prompt.trim().length === 0) {
      return {
        success: false,
        error: "Prompt cannot be empty",
      };
    }

    const generator = new ChaiAiPageGenerator();
    const pageContent = await generator.generatePage(prompt);

    return {
      success: true,
      pageContent,
    };
  } catch (error) {
    console.error("Error generating page:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate page",
    };
  }
}
