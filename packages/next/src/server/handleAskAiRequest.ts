import { ChaiAIChatHandler } from "@chaibuilder/pages/server";
import { NextResponse } from "next/server";

export async function handleAskAiRequest(ai: ChaiAIChatHandler, requestBody: any): Promise<NextResponse> {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log("Add", requestBody);

        const result = await ai.handleRequest(requestBody);

        if (!result?.textStream) {
          controller.enqueue(encoder.encode("Error: No streaming response available"));
          controller.close();
          return;
        }

        // Stream the AI response chunks
        for await (const chunk of result.textStream) {
          if (chunk) {
            controller.enqueue(encoder.encode(chunk));
          }
        }

        controller.close();
      } catch (error) {
        controller.enqueue(encoder.encode(`Error: ${error instanceof Error ? error.message : "Unknown error"}`));
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
