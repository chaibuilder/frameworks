import { ChaiBlock } from "@chaibuilder/sdk";
import { SupabaseClient } from "@supabase/supabase-js";
import { get, has, isEmpty, omit, uniq } from "lodash";
import { CHAI_ONLINE_PAGES_TABLE_NAME, CHAI_PAGES_TABLE_NAME } from "./CONSTANTS";

export class ChaiBuilderPageBlocks {
  constructor(
    private supabase: SupabaseClient,
    private appUuid: string,
  ) {}

  async copyFromTemplate(partialPageId: string, libraryName: string) {
    //check if the partialPageIs is already created
    const { data: partialPage } = await this.supabase
      .from(CHAI_PAGES_TABLE_NAME)
      .select("id")
      .eq("libRefId", partialPageId)
      .eq("app", this.appUuid)
      .single();

    if (partialPage) {
      return { id: partialPage.id, libRefId: partialPageId };
    }

    const { data } = await this.supabase.from(CHAI_PAGES_TABLE_NAME).select("*").eq("id", partialPageId).single();

    if (!data) {
      throw new Error("ERROR_COPYING_FROM_TEMPLATE");
    }
    const newData = omit(
      {
        ...data,
        app: this.appUuid,
        libRefId: partialPageId,
        name: `${libraryName} - ${data.name}`,
        online: false,
      },
      ["id"],
    );
    const { data: newPage } = await this.supabase.from(CHAI_PAGES_TABLE_NAME).insert(newData).select("*").single();

    if (!newPage) {
      throw new Error("ERROR_COPYING_FROM_TEMPLATE");
    }

    return { id: newPage.id, libRefId: partialPageId };
  }

  async getPartialBlockUsage(partialBlockId: string) {
    const { data } = await this.supabase
      .from(CHAI_ONLINE_PAGES_TABLE_NAME)
      .select("page")
      .like("partialBlocks", `%${partialBlockId}%`);

    return uniq(data ?? []).map((row) => row.page);
  }

  async getPagesUsingPage(pageId: string) {
    const { data } = await this.supabase.from(CHAI_ONLINE_PAGES_TABLE_NAME).select("page").like("link", `%${pageId}%`);

    return uniq(data ?? []).map((row) => row.page);
  }

  async getPartialBlock(partialBlockId: string, draft: boolean) {
    const table = draft ? CHAI_PAGES_TABLE_NAME : CHAI_ONLINE_PAGES_TABLE_NAME;
    const query = this.supabase.from(table).select("blocks").eq("app", this.appUuid).eq("id", partialBlockId);

    const { data, error } = await query.single();

    if (error) return [];

    return get(data, "blocks", []) as ChaiBlock[];
  }

  async getMergedBlocks(blocks: ChaiBlock[], draft: boolean) {
    const partialBlocksList = blocks.filter(({ _type }) => _type === "GlobalBlock" || _type === "PartialBlock");

    for (let i = 0; i < partialBlocksList.length; i++) {
      const partialBlock = partialBlocksList[i] as ChaiBlock;
      const partialBlockId = get(partialBlock, "partialBlockId", get(partialBlock, "globalBlock", ""));
      if (partialBlockId === "") continue;
      let partialBlocks = await this.getPartialBlock(partialBlockId, draft);

      if (partialBlock._parent && partialBlocks?.length > 0) {
        partialBlocks = partialBlocks.map((block) => {
          if (isEmpty(block._parent)) block._parent = partialBlock._parent;
          if (has(block, "_show")) block._show = partialBlock._show;
          return block;
        });
      }

      const index = blocks.indexOf(partialBlock);
      blocks.splice(index, 1, ...partialBlocks);
    }

    return blocks;
  }
}
