# Chai Builder for Astro

This package provides Chai Builder integration for Astro projects.

## Changes from Next.js Version

This Astro package replaces all Next.js specific implementations with Astro equivalents:

### Core Changes

1. **Dynamic Imports**: Replaced `next/dynamic` with React's `lazy` and `Suspense`
2. **API Routes**: Updated to use Astro's API context instead of Next.js Request/Response
3. **Caching**: Implemented custom in-memory caching to replace Next.js `unstable_cache`
4. **Image Component**: Replaced Next.js `Image` with standard `img` element
5. **Link Component**: Replaced Next.js `Link` with standard anchor (`a`) elements

### Configuration

The package now exports an Astro integration instead of a Next.js config wrapper:

```typescript
import { chaiBuilderIntegration } from "chai-astro/config";

export default {
  integrations: [
    chaiBuilderIntegration({
      enableCanvas: true, // optional
    }),
  ],
};
```

### API Routes

For API routes, use Astro's API route format:

```typescript
import { builderApiHandler } from "chai-astro/server";

const handler = builderApiHandler(process.env.CHAI_BUILDER_API_KEY);

export async function POST(context) {
  return await handler(context);
}
```

### Notes

- **Cache Invalidation**: Astro doesn't have built-in cache revalidation like Next.js. The package includes a simple in-memory cache, but you may want to implement your own caching strategy for production.
- **Prefetching**: Link prefetching is not automatically handled like in Next.js. You may need to implement your own prefetching strategy if needed.
- **Image Optimization**: The package uses standard `img` elements instead of Next.js optimized images. Consider using Astro's image optimization features if needed.

## Installation

```bash
npm install chai-astro
```

## Usage

The API remains mostly the same as the Next.js version, with the configuration changes noted above.
