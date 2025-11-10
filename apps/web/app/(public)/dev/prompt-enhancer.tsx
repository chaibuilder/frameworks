"use client";

import { useState, useTransition } from "react";
import { enhancePromptAction, generatePageAction } from "./actions";

export function PromptEnhancer() {
  const [prompt, setPrompt] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [pageContent, setPageContent] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleEnhance = () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setError("");
    startTransition(async () => {
      const result = await enhancePromptAction(prompt);
      if (result.success && result.enhancedPrompt) {
        setEnhancedPrompt(result.enhancedPrompt);
        setError("");
      } else {
        setError(result.error || "Failed to enhance prompt");
      }
    });
  };

  const handleGenerate = () => {
    const contentToGenerate = enhancedPrompt || prompt;
    if (!contentToGenerate.trim()) {
      setError("Please enter a prompt or enhance it first");
      return;
    }

    setError("");
    startTransition(async () => {
      const result = await generatePageAction(contentToGenerate);
      if (result.success && result.pageContent) {
        setPageContent(result.pageContent);
        setError("");
      } else {
        setError(result.error || "Failed to generate page");
      }
    });
  };

  const handleUseEnhanced = () => {
    setPrompt(enhancedPrompt);
    setEnhancedPrompt("");
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <label htmlFor="prompt" className="mb-2 block text-sm font-medium text-gray-700">
          Your Prompt
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Create a landing page for my SaaS product..."
          className="h-32 w-full resize-none rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          disabled={isPending}
        />
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleEnhance}
            disabled={isPending || !prompt.trim()}
            className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300">
            {isPending ? "Processing..." : "✨ Enhance Prompt"}
          </button>
          <button
            onClick={handleGenerate}
            disabled={isPending || !prompt.trim()}
            className="rounded-lg bg-green-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300">
            {isPending ? "Generating..." : "🚀 Generate Page"}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Enhanced Prompt Section */}
      {enhancedPrompt && (
        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Enhanced Prompt</h2>
            <button
              onClick={handleUseEnhanced}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700">
              Use This Prompt
            </button>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="whitespace-pre-wrap text-gray-800">{enhancedPrompt}</p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="mt-4 w-full rounded-lg bg-green-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300">
            {isPending ? "Generating..." : "🚀 Generate Page with Enhanced Prompt"}
          </button>
        </div>
      )}

      {/* Generated Page Content */}
      {pageContent && (
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Generated Page Content</h2>
          <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">{pageContent}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
