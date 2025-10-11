"use client";
import { ChaiBuilderEditorProps } from "@chaibuilder/pages";
import { SupabaseClient } from "@supabase/supabase-js";
import { startsWith } from "lodash";
import dynamic from "next/dynamic";
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

type ChaiWebSocketClient = SupabaseClient;
type LoggedInUser = {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  metadata?: Record<string, any>;
};

type ChaiBuilderProps = {
  hasReactQueryProvider?: boolean;
  topLeftCorner?: React.FC;
  apiUrl?: string;
  usersApiUrl?: string;
  assetsApiUrl?: string;
  getPreviewUrl?: (slug: string) => string;
  getLiveUrl?: (slug: string) => string;
  onLogout?: () => void;
  getAccessToken: () => Promise<string>;
  currentUser: LoggedInUser | null;
  websocket?: ChaiWebSocketClient;
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

const client = getSupabaseClient();

export default (props: ChaiBuilderProps) => {
  const builderApiUrl = props.apiUrl ?? API_URL;

  if (!client) {
    return <div>Loading...</div>;
  }

  return (
    <ChaiBuilder
      autoSave={true}
      autoSaveInterval={20}
      hasReactQueryProvider={props.hasReactQueryProvider ?? false}
      supabaseInstance={client}
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
