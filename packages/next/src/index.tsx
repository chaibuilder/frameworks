"use client";

import ChaiBuilderPages from "@chaibuilder/pages";

const Logo = () => <h1 className="text-xl font-bold">Chai Builder</h1>;

// Adding explicit type annotation to fix the portability warning
// Using a more compatible approach with 'any' to resolve the portability issue
export default function ChaiBuilder(): any {
  return (
    <ChaiBuilderPages
      getPreviewUrl={(slug: string) => {
        return `/chai/preview?slug=${slug}`;
      }}
      getLiveUrl={(slug: string) => {
        return `/chai/preview?disable=true&slug=${slug}`;
      }}
      autoSaveSupport={false}
      logo={Logo}
    />
  );
}
