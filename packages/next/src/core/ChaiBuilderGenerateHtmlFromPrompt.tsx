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

// Helper function to optimize image before sending
const optimizeImage = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        // Calculate new dimensions (max width 1024px)
        let width = img.width;
        let height = img.height;
        const maxWidth = 1024;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 with quality optimization
        const optimizedBase64 = canvas.toDataURL("image/jpeg", 0.85);
        resolve(optimizedBase64);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
};

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
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file");
      return;
    }

    // Validate file size (max 10MB before optimization)
    if (file.size > 10 * 1024 * 1024) {
      setError("Image size must be less than 10MB");
      return;
    }

    try {
      setError(null);
      const optimizedImage = await optimizeImage(file);
      setImage(optimizedImage);
      setImageFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process image");
    }
  };

  const handleRemoveImage = () => {
    setImage(null);
    setImageFile(null);
  };

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
          data: { 
            prompt,
            image: image || undefined,
          },
        },
      });

      if (response.error) {
        setError(response.error);
      } else {
        const blocks = getBlocksFromHTML(response.html);
        addPredefinedBlock([...blocks], parentId, position);
        setPrompt("");
        setImage(null);
        setImageFile(null);
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

          <div className="flex items-center gap-2">
            {image ? (
              <div className="border-input bg-muted flex flex-1 items-center gap-2 rounded-md border px-3 py-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted-foreground shrink-0">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                <span className="text-foreground flex-1 truncate text-sm">{imageFile?.name || "Image attached"}</span>
                <button
                  onClick={handleRemoveImage}
                  className="text-muted-foreground hover:text-destructive shrink-0 transition-colors"
                  type="button">
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
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label
                htmlFor="image"
                className="border-input bg-background hover:bg-accent hover:text-accent-foreground flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted-foreground shrink-0">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                <span className="text-muted-foreground text-sm">Attach image (optional)</span>
              </label>
            )}
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
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
