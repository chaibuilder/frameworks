import { PromptEnhancer } from "./prompt-enhancer";

export default function DevPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            AI Page Generator
          </h1>
          <p className="text-gray-600">
            Enter your prompt and let AI enhance it for better results
          </p>
        </div>
        <PromptEnhancer />
      </div>
    </div>
  );
}
