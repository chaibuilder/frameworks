import { getBlocksFromHTML, useAddBlock, useChaiFetch } from "@chaibuilder/pages";
import { useState } from "react";

export const ChaiBuilderGenerateHtmlFromPrompt = ({ parentId, position }: { parentId?: string; position?: number }) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chaiFetch = useChaiFetch();
  const { addPredefinedBlock } = useAddBlock();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await chaiFetch({
        url: "/api",
        method: "POST",
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate HTML");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="prompt" className="text-foreground text-sm font-medium">
          Describe the HTML you want to generate
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="E.g., Create a hero section with a heading, subheading, and a call-to-action button"
          className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring min-h-[120px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading}
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="bg-primary text-primary-foreground ring-offset-background hover:bg-primary/90 focus-visible:ring-ring inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
        {loading ? "Generating..." : "Generate HTML"}
      </button>

      {error && (
        <div className="border-destructive bg-destructive/10 text-destructive rounded-md border p-3 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};
