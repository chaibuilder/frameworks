import { registerChaiBlock } from "chai-next/blocks";
import { ChaiForm, FormConfig } from "./form-block";

export const registerBlocks = () => {
  registerChaiBlock(ChaiForm, FormConfig);
};
