import { createClient, SupabaseClient } from "@supabase/supabase-js";

let ADMIIN_INSATANCE: SupabaseClient | null = null;
let CLIENT_INSTANCE: SupabaseClient | null = null;

const checkForEnv = (envVar: string | undefined, name: string) => {
  if (!envVar) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return envVar;
};

export const getSupabaseAdmin = async () => {
  checkForEnv(process.env.SUPABASE_SERVICE_KEY, "SUPABASE_SERVICE_KEY");
  checkForEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
  if (ADMIIN_INSATANCE) {
    return ADMIIN_INSATANCE;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";
  ADMIIN_INSATANCE = await createClient(supabaseUrl, supabaseKey);
  return ADMIIN_INSATANCE;
};

export const getSupabaseClient = async () => {
  checkForEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
  checkForEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (CLIENT_INSTANCE) {
    return CLIENT_INSTANCE;
  }
  // Use the same URL and key as the admin instance, but you can customize this if needed
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  CLIENT_INSTANCE = await createClient(supabaseUrl, supabaseKey);
  return CLIENT_INSTANCE;
};
