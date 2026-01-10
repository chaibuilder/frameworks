import { getSupabaseAdmin } from "@/supabase";
import { initChaiBuilderActionHandler } from "@chaibuilder/nextjs/server";
import { get, has } from "lodash";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const apiKey = process.env.CHAIBUILDER_API_KEY!;

//TODO: Register actions
// ChaiActionsRegistry.registerActions(SupabaseStorageActions);

export const POST = async (req: NextRequest) => {
  const actionData = (await req.json()) as { action: string; data?: unknown };
  const shouldByPassAuth = ["LOGIN"].includes(actionData.action);
  let authTokenOrUserId: string = "";
  //TODO: Detect user and session from auth
  if (shouldByPassAuth) {
    const authorization = req.headers.get("authorization");
    authTokenOrUserId = (authorization ? authorization.split(" ")[1] : "") as string;
    const supabase = await getSupabaseAdmin();
    const supabaseUser = await supabase.auth.getUser(authTokenOrUserId);
    if (supabaseUser.error) {
      // If the token is invalid or expired, return a 401 response
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }
    authTokenOrUserId = supabaseUser.data.user?.id || "";
  }

  //handle user id based on auth
  const handler: any = initChaiBuilderActionHandler({ apiKey, userId: authTokenOrUserId });

  const response = await handler(actionData);
  if (has(response, "error")) {
    return NextResponse.json(response, { status: response.status });
  }
  for (const tag of get(response, "tags", [])) revalidateTag(tag, "max");
  return NextResponse.json(response);
};
