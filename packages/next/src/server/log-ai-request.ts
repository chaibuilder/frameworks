import { get } from "lodash";
import { getSupabaseAdmin } from "./supabase";

export async function logAiRequestError({
  userId: authTokenOrUserId,
  startTime,
  error,
  model,
  prompt,
}: {
  userId: string;
  startTime: number;
  error: any;
  model: string;
  prompt: string;
}) {
  const supabase = await getSupabaseAdmin();

  const errorStr = String(error);

  const totalDuration = startTime > 0 ? new Date().getTime() - startTime : 0;
  const payload = {
    model,
    totalDuration,
    error: errorStr,
    totalTokens: {},
    tokenUsage: 0,
    cost: 0,
    prompt,
    user: authTokenOrUserId,
    client: process?.env?.CHAIBUILDER_CLIENT_ID || "",
  };

  await supabase.from("ai_logs").insert(payload);
}

export async function logAiRequest({
  userId,
  startTime,
  arg,
  prompt,
}: {
  userId: string;
  startTime: number;
  arg: any;
  prompt: string;
}) {
  const supabase = await getSupabaseAdmin();
  const supabaseUser = await supabase.auth.getUser(userId);
  if (supabaseUser.error) return;

  const totalUsage = arg?.totalUsage;
  const cost = arg?.providerMetadata?.gateway?.cost;
  const providerAttempts = get(arg, "providerMetadata.gateway.routing.modelAttempts.[0].providerAttempts.[0]", {});
  const model = get(providerAttempts, "providerApiModelId");
  const totalDuration = startTime > 0 ? Math.floor(new Date().getTime() - startTime) : 0;

  const payload = {
    model,
    totalDuration,
    error: null,
    totalTokens: totalUsage?.totalTokens,
    tokenUsage: totalUsage,
    cost,
    prompt,
    user: supabaseUser?.data?.user?.id,
    client: process?.env?.CHAIBUILDER_CLIENT_ID || "",
  };

  await supabase.from("ai_logs").insert(payload);
}
