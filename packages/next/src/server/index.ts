import { builderApiHandler } from "./builder-api-handler";
import { ChaiAiPageGenerator } from "./chai-ai-page-generator";
import { ChaiBuilder } from "./chai-builder";

export {
  registerChaiCollection,
  registerChaiGlobalDataProvider,
  registerChaiPageType,
  registerChaiPartialType,
} from "@chaibuilder/pages/server";

export { getSupabaseAdmin } from "./supabase";
export { builderApiHandler, ChaiAiPageGenerator };

export default ChaiBuilder;
