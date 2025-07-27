import { getStylesForBlocks } from "@chaibuilder/pages/render";
import { ChaiBlock } from "@chaibuilder/pages/runtime";
import { filterDuplicateStyles } from "./styles-helper";

export const getPageStyles = async (blocks: ChaiBlock[]) => {
  const styles = await getStylesForBlocks(blocks);
  // minify styles and filter out duplicates
  const minifiedStyles = styles.replace(/\s+/g, " ").trim();
  const filteredStyles = await filterDuplicateStyles(minifiedStyles);
  return filteredStyles;
};
