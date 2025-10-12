# Generate HTML from Prompt Action

This action generates clean, semantic HTML with Tailwind CSS classes from a text prompt using the Vercel AI SDK.

## Action Name
`GENERATE_HTML_FROM_PROMPT`

## Input Data

```typescript
{
  prompt: string;      // Required: Description of the HTML to generate
  context?: string;    // Optional: Additional context or requirements
}
```

## Response

```typescript
{
  html: string;        // Generated HTML with Tailwind CSS classes
}
```

## Example Usage

### Example 1: Simple Component
```typescript
const result = await action.execute({
  prompt: "Create a hero section with a heading, subheading, and a call-to-action button"
});
// Returns clean HTML with Tailwind classes
```

### Example 2: With Context
```typescript
const result = await action.execute({
  prompt: "Create a pricing card",
  context: "The card should have a dark theme and include a monthly price, features list, and a subscribe button"
});
```

### Example 3: Complex Layout
```typescript
const result = await action.execute({
  prompt: "Create a responsive navigation bar with logo, menu items, and a mobile hamburger menu",
  context: "Use blue as the primary color and ensure it's sticky on scroll"
});
```

## Features

- ✅ Generates semantic, accessible HTML
- ✅ Uses modern Tailwind CSS v3+ utility classes
- ✅ Mobile-first responsive design
- ✅ Proper accessibility attributes (ARIA labels, alt texts)
- ✅ Clean output without markdown formatting
- ✅ No wrapper tags (html, head, body) - only content HTML

## Environment Variables

Ensure these environment variables are set:

- `CHAIBUILDER_AI_API_KEY` - OpenAI API key (required)
- `CHAIBUILDER_AI_MODEL` - AI model to use (optional, defaults to "gpt-4o-mini")

## Notes

- The action automatically strips markdown code blocks from the response
- The generated HTML is ready to be inserted into your page
- Uses the same AI configuration as other Chai Builder AI actions
