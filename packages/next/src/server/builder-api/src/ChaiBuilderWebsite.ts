import { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { pick } from "lodash";
import { CHAI_APPS_ONLINE_TABLE_NAME, CHAI_APPS_TABLE_NAME } from "./CONSTANTS";
import { apiError } from "./lib";

type ChaiBuilderWebsiteConfig = {
  fallbackLang: string;
  languages: string[];
  theme: any;
};

export class ChaiBuilderWebsite {
  constructor(
    private supabase: SupabaseClient,
    private appUuid: string,
    private chaiUser: string,
  ) {}

  private generateDeterministicUuid(seed: string): string {
    // Create a deterministic hash from the seed
    const hash = createHash("sha256").update(seed).digest("hex");

    // Format as UUID v4 structure: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuid = [
      hash.substring(0, 8),
      hash.substring(8, 12),
      "4" + hash.substring(13, 16), // Version 4
      ((parseInt(hash.substring(16, 17), 16) & 0x3) | 0x8).toString(16) + hash.substring(17, 20), // Variant bits
      hash.substring(20, 32),
    ].join("-");

    return uuid;
  }

  getDefaultSettings() {
    return {
      fallbackLang: "en",
      languages: [],
      theme: {},
    };
  }

  async getWebsiteData(draft: boolean) {
    const { data, error } = await this.supabase
      .from(draft ? CHAI_APPS_TABLE_NAME : CHAI_APPS_ONLINE_TABLE_NAME)
      .select("data")
      .eq("id", this.appUuid)
      .single();

    if (error) {
      throw apiError("ERROR_WEBSITE_DATA", error);
    }

    return data?.data ?? {};
  }

  async getWebsiteSettings(draft: boolean) {
    const { data, error } = await this.supabase
      .from(draft ? CHAI_APPS_TABLE_NAME : CHAI_APPS_ONLINE_TABLE_NAME)
      .select("theme,fallbackLang,languages,settings,designTokens")
      .eq("id", this.appUuid)
      .single();

    if (error) {
      throw apiError("ERROR_PROJECT_CONFIG", error);
    }

    //@ts-ignore
    const config = data as ChaiBuilderWebsiteConfig;
    const deterministicAppKey = this.generateDeterministicUuid(this.appUuid);
    return {
      ...this.getDefaultSettings(),
      ...config,
      appKey: deterministicAppKey,
    };
  }

  async updateWebsiteSettings(settings: ChaiBuilderWebsiteConfig) {
    const columns = pick(settings, ["theme", "designTokens"]);
    const { error } = await this.supabase
      .from(CHAI_APPS_TABLE_NAME)
      .update({ ...columns, changes: ["Updated"] })
      .eq("id", this.appUuid);

    if (error) {
      throw apiError("ERROR_UPDATE_WEBSITE_SETTINGS", error);
    }

    return { success: true };
  }

  async updateWebsiteData(data: any) {
    const { data: existingData, error: existingDataError } = await this.supabase
      .from(CHAI_APPS_TABLE_NAME)
      .select("data")
      .eq("id", this.appUuid)
      .single();

    if (existingDataError) {
      throw apiError("ERROR_UPDATE_WEBSITE_DATA", existingDataError);
    }

    const { error } = await this.supabase
      .from(CHAI_APPS_TABLE_NAME)
      .update({
        data: { ...(existingData?.data ?? {}), ...data },
        changes: ["Updated"],
      })
      .eq("id", this.appUuid);

    if (error) {
      throw apiError("ERROR_UPDATE_WEBSITE_DATA", error);
    }

    return { success: true };
  }
}
