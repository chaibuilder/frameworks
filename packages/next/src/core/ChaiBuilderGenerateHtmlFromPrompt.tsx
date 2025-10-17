import { getBlocksFromHTML, useAddBlock, useBuilderFetch } from "@chaibuilder/pages";
import { useEffect, useState } from "react";

const PROCESSING_MESSAGES = [
  "🎨 Analyzing your prompt...",
  "🧠 Thinking creatively...",
  "✨ Crafting beautiful HTML...",
  "🎯 Applying Tailwind styles...",
  "🖼️ Adding visual elements...",
  "🎪 Making it responsive...",
  "✅ Almost there...",
];

export const ChaiBuilderGenerateHtmlFromPrompt = ({
  parentId,
  position,
  close,
}: {
  parentId?: string;
  position?: number;
  close: () => void;
}) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState("");
  const fetch = useBuilderFetch();
  const { addPredefinedBlock } = useAddBlock();

  useEffect(() => {
    if (!loading) {
      setProcessingMessage("");
      return;
    }

    let messageIndex = 0;
    setProcessingMessage(PROCESSING_MESSAGES[0] || "");

    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % PROCESSING_MESSAGES.length;
      setProcessingMessage(PROCESSING_MESSAGES[messageIndex] || "");
    }, 2000);

    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await fetch({
        body: {
          action: "GENERATE_HTML_FROM_PROMPT",
          data: { prompt },
        },
      });

      if (response.error) {
        setError(response.error);
      } else {
        const blocks = getBlocksFromHTML(response.html);
        addPredefinedBlock([...blocks], parentId, position);
        setPrompt("");
        close();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate HTML");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-6 py-12">
          <div className="relative">
            <div className="bg-primary/20 absolute h-20 w-20 animate-ping rounded-full"></div>
            <div className="bg-primary flex h-20 w-20 animate-pulse items-center justify-center rounded-full">
              <svg
                className="text-primary-foreground h-10 w-10 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
          <div className="space-y-2 text-center">
            <p className="text-foreground animate-pulse text-lg font-semibold">{processingMessage}</p>
            <p className="text-muted-foreground text-sm">This may take a few moments...</p>
          </div>
          <div className="flex gap-1">
            <div className="bg-primary h-2 w-2 animate-bounce rounded-full" style={{ animationDelay: "0ms" }}></div>
            <div className="bg-primary h-2 w-2 animate-bounce rounded-full" style={{ animationDelay: "150ms" }}></div>
            <div className="bg-primary h-2 w-2 animate-bounce rounded-full" style={{ animationDelay: "300ms" }}></div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <label htmlFor="prompt" className="text-foreground text-sm font-medium">
              Tell AI what you want to generate
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleGenerate();
                }
              }}
              rows={8}
              placeholder="E.g., Create a hero section with a heading, subheading, and a call-to-action button"
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[120px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-muted-foreground text-xs">Press Cmd/Ctrl + Enter to generate</p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!prompt.trim()}
            className="bg-primary text-primary-foreground ring-offset-background hover:bg-primary/90 focus-visible:ring-ring inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M12 5v14" />
              <path d="m19 12-7 7-7-7" />
            </svg>
            Generate with AI
          </button>

          {error && (
            <div className="border-destructive bg-destructive/10 text-destructive animate-in fade-in slide-in-from-top-2 rounded-md border p-3 text-sm">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
};
