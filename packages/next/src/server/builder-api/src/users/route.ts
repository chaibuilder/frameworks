import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../supabase";
import { decodedApiKey } from "../lib";
import { ChaiBuilderUsers } from "./ChaiBuilderUsers";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? "";

export const POST = async (req: Request) => {
  const apiKey = req.headers.get("x-chai-api-key");

  if (!apiKey) {
    return NextResponse.json({ error: "API KEY IS REQUIRED" }, { status: 400 });
  }
  const appId = decodedApiKey(apiKey, ENCRYPTION_KEY).data?.appId;

  if (!appId) {
    return NextResponse.json({ error: "INVALID API KEY" }, { status: 400 });
  }

  const { action, data } = await req.json();
  const supabase = await getSupabaseAdmin();
  const users = new ChaiBuilderUsers(supabase, appId);

  if (action === "LOGIN") {
    const { email, password } = data as { email: string; password: string };
    const { data: userData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log("error?.message", error?.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const appUser = await users.getAppUser(userData.user?.id as string);

    if (!appUser) {
      return NextResponse.json(
        {
          error: "This email is not registered with us. Please contact your administrator",
        },
        { status: 400 },
      );
    }

    if (appUser.status !== "active") {
      return NextResponse.json(
        {
          error: "Your account is not active. Please contact your administrator to activate your account",
        },
        { status: 400 },
      );
    }

    const response = {
      id: userData.user?.id,
      email: userData.user?.email,
      accessToken: userData.session?.access_token,
      refreshToken: userData.session?.refresh_token,
      expiresAt: userData.session?.expires_at,
      name: userData.user?.user_metadata?.name,
      avatar: userData.user?.user_metadata?.avatar,
    };

    return NextResponse.json(response, { status: 200 });
  }

  if (action === "REFRESH_TOKEN") {
    const { error } = await supabase.auth.setSession({
      access_token: data.accessToken as string,
      refresh_token: data.refreshToken as string,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const { data: userData, error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError) {
      return NextResponse.json({ error: refreshError.message }, { status: 401 });
    }
    return NextResponse.json(
      {
        id: userData.user?.id,
        email: userData.user?.email,
        accessToken: userData.session?.access_token,
        refreshToken: userData.session?.refresh_token,
        expiresAt: userData.session?.expires_at,
        name: userData.user?.user_metadata?.name,
        avatar: userData.user?.user_metadata?.avatar,
      },
      { status: 200 },
    );
  }

  if (action === "LOGOUT") {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ message: "Logged out" }, { status: 200 });
  }
  if (action === "GET_CHAI_USER") {
    const { data: userData, error } = await supabase.auth.admin.getUserById(data.userId as string);
    if (error) {
      return NextResponse.json(
        {
          id: "unknown",
          email: "unknown@chaibuilder.com",
          name: "Unknown",
          avatar: "",
        },
        { status: 200 },
      );
    }
    return NextResponse.json(
      {
        id: userData.user?.id,
        email: userData.user?.email,
        name: userData.user?.user_metadata?.name,
        avatar: userData.user?.user_metadata?.avatar,
      },
      { status: 200 },
    );
  }
  if (action === "GET_ROLE_AND_PERMISSIONS") {
    return NextResponse.json(
      {
        role: "admin",
        permissions: null,
      },
      { status: 200 },
    );
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
};
