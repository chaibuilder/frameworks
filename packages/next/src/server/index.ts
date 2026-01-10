import ChaiActionsRegistry from "./builder-api/src/actions/actions-registery";
import { initChaiBuilderActionHandler } from "./builder-api/src/actions/chai-builder-actions-handler";
import { ChaiBuilder } from "./chai-builder";

export {
  registerChaiCollection,
  registerChaiGlobalDataProvider,
  registerChaiPageType,
  registerChaiPartialType,
} from "@chaibuilder/pages/server";

export { db, schema } from "./db";
export { ChaiActionsRegistry, initChaiBuilderActionHandler };

//TODO:
// export SupabaseAuthActions = { 'ACTION_NAME': new ActionClass() }
// export SupabaseStorageActions = { 'ACTION_NAME': new ActionClass() }

export default ChaiBuilder;
