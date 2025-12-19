import { builderApiHandler } from "./builder-api-handler";
import { ChaiBuilder } from "./chai-builder";

export {
  registerChaiCollection,
  registerChaiGlobalDataProvider,
  registerChaiPageType,
  registerChaiPartialType,
} from "@chaibuilder/pages/server";

export { getSupabaseAdmin } from "./supabase";
export { db, schema } from "./db";
export { builderApiHandler };

export default ChaiBuilder;
