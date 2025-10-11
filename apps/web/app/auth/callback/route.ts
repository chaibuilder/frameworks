import { createClient } from "@/chai/supabase.auth.server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const host = request.headers.get("host");
  const origin = process.env.NODE_ENV === "development" ? `http://${host}` : `https://${host}`;

  const code = searchParams.get("code");
  const type = searchParams.get("type") ?? "";
  const next = "/editor";
  console.log("searchParams", request.url, code, type, next);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (type === "reset") {
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/editor`);
}
