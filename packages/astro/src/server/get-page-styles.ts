import { getStylesForBlocks } from "@chaibuilder/pages/render";
import { ChaiBlock } from "@chaibuilder/pages/runtime";
import { filterDuplicateStyles } from "./styles-helper";

export const getPageStyles = async (blocks: ChaiBlock[]) => {
  const styles = await getStylesForBlocks(blocks);
  const minifiedStyles = styles.replace(/\s+/g, " ").trim();
  return await filterDuplicateStyles(minifiedStyles);
};
