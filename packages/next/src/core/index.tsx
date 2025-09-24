"use client";
import { ChaiBuilderEditorProps } from "@chaibuilder/pages";
import { startsWith } from "lodash";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import "../../styles";
import { getSupabaseClient } from "./supabase";

// Only re-export specific items from @chaibuilder/pages to avoid interface conflicts
export * from "@chaibuilder/pages";
export * from "@chaibuilder/sdk/ui";
export { getSupabaseClient } from "./supabase";

// Use a type assertion to avoid the TypeScript error with interfaces
export const ChaiBuilder: any = dynamic(() => import("@chaibuilder/pages"), {
  ssr: false,
});

type ChaiBuilderProps = {
  logo?: React.FC;
  apiUrl?: string;
  getPreviewUrl?: (slug: string) => string;
  getLiveUrl?: (slug: string) => string;
  hasReactQueryProvider?: boolean;
  getAccessToken?: () => string;
} & Pick<
  ChaiBuilderEditorProps,
  | "onError"
  | "translations"
  | "locale"
  | "htmlDir"
  | "autoSave"
  | "autoSaveInterval"
  | "fallbackLang"
  | "languages"
  | "themePresets"
>;

const API_URL = "builder/api";

export default (props: ChaiBuilderProps) => {
  const builderApiUrl = props.apiUrl ?? API_URL;
  const [supabaseClient, setSupabaseClient] = useState<any>(null);
  useEffect(() => {
    const initSupabase = async () => {
      const client = await getSupabaseClient();
      setSupabaseClient(client);
    };
    initSupabase();
  }, []);

  console.log("supabaseClient", supabaseClient, props);
  return (
    <ChaiBuilder
      getAccessToken={() => {
        return supabaseClient?.auth.session()?.access_token;
      }}
      autoSave={true}
      autoSaveInterval={20}
      hasReactQueryProvider={props.hasReactQueryProvider ?? false}
      supabaseInstance={supabaseClient}
      apiUrl={builderApiUrl}
      usersApiUrl={builderApiUrl}
      assetsApiUrl={builderApiUrl}
      getPreviewUrl={(slug: string) => {
        return `/api/preview?slug=${startsWith(slug, "/") ? slug : "/_partial/" + slug}`;
      }}
      getLiveUrl={(slug: string) => {
        return `/api/preview?disable=true&slug=${startsWith(slug, "/") ? slug : "/_partial/" + slug}`;
      }}
      {...props}
    />
  );
};
