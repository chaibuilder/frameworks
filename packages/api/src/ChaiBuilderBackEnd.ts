import { ChaiBlock } from "@chaibuilder/sdk";

export type TChaiBuilderTheme = Record<string, string | number>;

export type ChaiApiActionArgs = {
  action:
    | "GET_DRAFT_PAGE" //Done
    | "GET_PAGE" //Done
    | "GET_PROJECT_PAGES" //Done
    | "GET_WEBSITE_PAGES" //Done
    | "GET_PROJECT_CONFIG" //Done
    | "GET_ASSETS"
    | "UPLOAD_ASSET"
    //ACTIONS & PUBLISH
    | "ASK_AI"
    | "TAKE_CONTROL"
    | "PUBLISH_PAGE" //Done
    | "PUBLISH_STYLES"
    | "SAVE_PAGE"

    //CREATE
    | "CREATE_PAGE" //Done
    | "CREATE_LANGUAGE_PAGE" //Done
    | "CREATE_GLOBAL_BLOCK" //Done
    | "CREATE_ASSET"

    //DELETE
    | "DELETE_PAGE"
    | "DELETE_LANGUAGE_PAGE"
    | "DELETE_GLOBAL_BLOCK"
    | "DELETE_ASSET"

    //UPDATE
    | "UPDATE_LANGUAGE_PAGE"
    | "UPDATE_GLOBAL_BLOCK"
    | "UPDATE_ASSET"
    | "UPDATE_PAGE";

  data?: Record<string, unknown>;
};

export type TChaiBackendResponse<T = unknown> = Promise<{
  status: number;
  data?: T;
  error?: string;
}>;

export type AskAiArgs = {
  type: "styles" | "content";
  aiContext: string;
  prompt: string;
  blocks: ChaiBlock[];
  lang: string;
};

export type SavePageArgs = {
  slug: string;
  blocks: ChaiBlock[];
  theme: Record<string, string>;
  aiContext?: string;
  seoSettings?: Record<string, string>;
  lang?: string;
};

export type GetPageBlocksArgs = {
  slug: string;
};

export type ChaiBuilderUser = {
  email?: string;
  username?: string;
  name?: string;
  picture?: string;
};

export type TChaiPage = {
  uuid: string;
  slug: string;
  draftBlocks: ChaiBlock[];
  name?: string;
  blocks?: ChaiBlock[];
  currentEditor?: ChaiBuilderUser;
  status?: "unpublished" | "published";
};

export type TChaiPageNotFoundError = {
  error: "NOT_FOUND";
  message?: string;
};
export type TChaiDraftPage = Omit<TChaiPage, "blocks">;
export type TChaiPublishedPage = Omit<TChaiPage, "draftBlocks">;
export type TChaiProjectPage = Omit<TChaiPage, "draftBlocks" | "blocks">;

export interface ChaiBuilderBackEndInterface {
  handle(args: ChaiApiActionArgs): TChaiBackendResponse;
}

export class ChaiBuilderBackEnd implements ChaiBuilderBackEndInterface {
  //@ts-ignore
  async handle(args: ChaiApiActionArgs): TChaiBackendResponse<any> {
    throw new Error("Method not implemented.");
  }
}
