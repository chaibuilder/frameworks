import ChaiActionsRegistry from "./builder-api/src/actions/actions-registery";
import { chaiBuilderActionHandler } from "./builder-api/src/actions/chai-builder-actions-handler";
import { ChaiBuilder } from "./chai-builder";

export {
  registerChaiCollection,
  registerChaiGlobalDataProvider,
  registerChaiPageType,
  registerChaiPartialType,
} from "@chaibuilder/pages/server";

export { db, schema } from "./db";
export { ChaiActionsRegistry, chaiBuilderActionHandler };

export default ChaiBuilder;
