import { SupabaseClient } from "@supabase/supabase-js";

export class ChaiBuilderUsers {
  constructor(
    private supabase: SupabaseClient,
    private appId: string
  ) {}

  async getAppUser(userId: string) {
    const { data, error } = await this.supabase
      .from("app_users")
      .select("*")
      .eq("user", userId)
      .eq("app", this.appId)
      .single();

    if (error) {
      console.error(userId, error);
      return null;
    }
    return data;
  }
}
