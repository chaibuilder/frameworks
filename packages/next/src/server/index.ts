import { chaiBuilderApiHandler } from "./builder-api-handler";
import { ChaiBuilder } from "./chai-builder";

export {
  registerChaiCollection,
  registerChaiGlobalDataProvider,
  registerChaiPageType,
  registerChaiPartialType,
} from "@chaibuilder/pages/server";

export { db, schema } from "./db";
export { chaiBuilderApiHandler };

export default ChaiBuilder;
