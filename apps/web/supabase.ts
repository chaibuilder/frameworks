import { createClient, SupabaseClient } from "@supabase/supabase-js";

let ADMIIN_INSTANCE: SupabaseClient | null = null;

const checkForEnv = (envVar: string | undefined, name: string) => {
  if (!envVar) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return envVar;
};

export const getSupabaseAdmin = async () => {
  checkForEnv(process.env.SUPABASE_SERVICE_KEY, "SUPABASE_SERVICE_KEY");
  checkForEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
  if (ADMIIN_INSTANCE) {
    return ADMIIN_INSTANCE;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";
  ADMIIN_INSTANCE = await createClient(supabaseUrl, supabaseKey);
  return ADMIIN_INSTANCE;
};
