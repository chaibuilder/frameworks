import { supabase } from "@/app/supabase";
import { z } from "zod";
import { CHAI_APPS_TABLE_NAME } from "../CONSTANTS";
import { ActionError } from "./action-error";
import { BaseAction } from "./base-action";

type GetWebsiteSettingsActionData = {
  draft: boolean;
};

type GetWebsiteSettingsActionResponse = {
  fallbackLang: string;
  languages: string[];
  theme: {
    colors: {
      card: [string, string];
      ring: [string, string];
      input: [string, string];
      muted: [string, string];
      accent: [string, string];
      border: [string, string];
      popover: [string, string];
      primary: [string, string];
      secondary: [string, string];
      background: [string, string];
      foreground: [string, string];
      destructive: [string, string];
      "card-foreground": [string, string];
      "muted-foreground": [string, string];
      "accent-foreground": [string, string];
      "popover-foreground": [string, string];
      "primary-foreground": [string, string];
      "secondary-foreground": [string, string];
      "destructive-foreground": [string, string];
    };
    fontFamily: {
      body: string;
      heading: string;
    };
    borderRadius: string;
  };
};

export class GetWebsiteSettingsAction extends BaseAction<
  GetWebsiteSettingsActionData,
  GetWebsiteSettingsActionResponse
> {
  protected getValidationSchema() {
    return z.object({
      draft: z.boolean(),
    });
  }

  async execute(): Promise<GetWebsiteSettingsActionResponse> {
    const { data: config, error } = await supabase
      .from(CHAI_APPS_TABLE_NAME)
      .select("theme,fallbackLang,languages")
      .eq("id", this.context?.appId)
      .single();

    if (error) {
      throw new ActionError("ERROR_PROJECT_CONFIG", error.message);
    }

    return { ...this.getDefaultSettings(), ...config };
  }

  getDefaultSettings() {
    return {
      fallbackLang: "en",
      languages: [],
      theme: {},
    };
  }
}
