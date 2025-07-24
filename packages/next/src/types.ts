import { ChaiBlock } from "@chaibuilder/sdk/runtime";

export type ChaiBuilderPage = {
  id: string;
  slug: string;
  pageType: string;
  fallbackLang: string;
  pageLang: string;
  blocks: ChaiBlock[];
  blocksWithoutPartials?: ChaiBlock[];
  createdAt: string;
  lastSaved: string;
  dynamic: boolean;
};
