import { ChaiBlock } from "@chaibuilder/sdk";

export type UpdatePageBody = {
  //primary keys
  id: string;

  // templates columns
  blocks?: ChaiBlock[];
  currentEditor?: string;

  // pages table
  slug?: string;
  name?: string;
  seo?: Record<string, any>;
  buildTime?: boolean;
};
