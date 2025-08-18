import { ChaiBuilderEditorProps } from "@chaibuilder/pages";
import { startsWith } from "lodash";
import type { FC } from "react";
import { lazy, Suspense } from "react";
import "../../styles";

// Only re-export specific items from @chaibuilder/pages to avoid interface conflicts
export * from "@chaibuilder/pages";
export * from "@chaibuilder/sdk/ui";

// Use lazy loading for client-side component in Astro
const ChaiBuilderComponent = lazy(() => import("@chaibuilder/pages"));

export const ChaiBuilder: FC<any> = (props) => (
  <Suspense fallback={<div>Loading ChaiBuilder...</div>}>
    <ChaiBuilderComponent {...props} />
  </Suspense>
);

type ChaiBuilderProps = {
  logo?: React.FC;
  apiUrl?: string;
  getPreviewUrl?: (slug: string) => string;
  getLiveUrl?: (slug: string) => string;
} & Pick<
  ChaiBuilderEditorProps,
  | "onError"
  | "translations"
  | "locale"
  | "htmlDir"
  | "autoSaveSupport"
  | "autoSaveInterval"
  | "fallbackLang"
  | "languages"
  | "themePresets"
>;

const API_URL = "/builder/api";

export default (props: ChaiBuilderProps) => {
  const builderApiUrl = props.apiUrl ?? API_URL;
  return (
    <ChaiBuilder
      autoSaveSupport={false}
      apiUrl={builderApiUrl}
      usersApiUrl={builderApiUrl}
      assetsApiUrl={builderApiUrl}
      getPreviewUrl={(slug: string) => {
        return `${API_URL}/preview?slug=${startsWith(slug, "/") ? slug : "/_partial/" + slug}`;
      }}
      getLiveUrl={(slug: string) => {
        return `${API_URL}/preview?disable=true&slug=${startsWith(slug, "/") ? slug : "/_partial/" + slug}`;
      }}
      {...props}
    />
  );
};
