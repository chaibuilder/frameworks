import { supabase } from "@/app/supabase";
import { NextRequest, NextResponse } from "next/server";
import { decodedApiKey } from "../chai/lib";
import { ChaiAssets } from "./class-chai-assets";
export const maxDuration = 30;

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? "";

export async function POST(req: NextRequest) {
  const formData = await req.json();

  // get appuuid from headers
  const apiKey = req.headers.get("x-chai-api-key");
  const token = req.headers.get("x-chai-auth-token") as string;

  if (!apiKey) {
    return NextResponse.json({ error: "API KEY IS REQUIRED" }, { status: 400 });
  }
  const appId = decodedApiKey(apiKey, ENCRYPTION_KEY).data?.appId;

  if (!appId) {
    return NextResponse.json({ error: "INVALID API KEY" }, { status: 400 });
  }

  const action = formData.action;
  let chaiUser = "";
  const user = await supabase.auth.getUser(token);
  if (user.error) {
    return NextResponse.json({ error: "INVALID TOKEN" }, { status: 401 });
  }
  chaiUser = user.data.user?.id;

  try {
    const backend = new ChaiAssets(appId, chaiUser);
    let response = null;
    switch (action) {
      case "UPLOAD_ASSET":
        response = await backend.upload(formData.data);
        break;
      case "GET_ASSET":
        response = await backend.getAsset(formData.data);
        break;
      case "GET_ASSETS":
        response = await backend.getAssets(formData.data);
        break;
      case "DELETE_ASSET":
        response = await backend.deleteAsset(formData.data);
        break;
      case "UPDATE_ASSET":
        response = await backend.updateAsset(formData.data);
        break;
      default:
        return NextResponse.json({ error: "INVALID ACTION" }, { status: 400 });
    }

    if (response.status !== 200) {
      return NextResponse.json(response, { status: response.status });
    }
    return NextResponse.json(response, { status: response.status });
  } catch (error) {
    console.error(action, appId, chaiUser, error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
