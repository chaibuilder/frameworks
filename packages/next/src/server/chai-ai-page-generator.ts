import { generateText } from "ai";
import { getAskAiSystemPrompt } from "./system-prompt";

export class ChaiAiPageGenerator {
  private model: string = "google/gemini-2.5-flash";
  private temperature: number = 0.7;

  async enhancePrompt(prompt: string): Promise<string> {
    const result = await generateText({
      model: this.model,
      system: `You are an expert prompt enhancer for website page generation. Your task is to transform user's brief requests into detailed, comprehensive prompts focused on business and UI needs.

When given a user's prompt for creating a website page (typically a home page), enhance it by:

1. **Business purpose**: Identify the type of business and what they want to achieve
2. **Page sections**: Suggest key sections like hero, features, testimonials, contact, footer
3. **Content details**: Describe what each section should say and show
4. **Visual style**: Include colors, fonts, imagery, and overall look and feel
5. **User actions**: Identify what visitors should do on the page
6. **Target audience**: Consider who will be visiting and what they need

Keep the enhanced prompt focused on what the page should look like and accomplish for the business. Avoid technical implementation details.

Example transformation:
User: "Create a landing page for my SaaS product"
Enhanced: "Create a modern SaaS landing page with: 1) Bold hero section with clear headline about solving customer pain points, subheadline explaining benefits, and prominent signup button 2) Features section showcasing 3-4 key benefits with simple icons and brief descriptions 3) Customer testimonials with photos and results 4) Pricing section with 3 clear tiers showing value 5) Footer with contact info and links. Use professional blue and white colors, clean typography, and photos of happy customers. Make it trustworthy and conversion-focused."`,
      messages: [{ role: "user", content: prompt }],
      temperature: this.temperature,
    });
    return result.text;
  }

  async generatePage(prompt: string): Promise<string> {
    const result = await generateText({
      model: this.model,
      system: getAskAiSystemPrompt(),
      messages: [{ role: "user", content: prompt }],
      temperature: this.temperature,
    });
    return result.text;
  }
}
