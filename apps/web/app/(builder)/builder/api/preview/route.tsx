// route handler with secret and slug
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Validate webhook secret from headers
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.CHAIBUILDER_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  // Parse request body
  const body = await req.json();
  const slug = body.slug;
  const disable = body.disable;

  // Check the required parameters
  if (!slug) {
    return NextResponse.json({ error: "Invalid Request" }, { status: 404 });
  }

  // Enable Draft Mode by setting the cookie
  if (disable === true || disable === "true") {
    (await draftMode()).disable();
  } else {
    (await draftMode()).enable();
  }

  // Redirect to the path from the fetched post
  // We don't redirect to body.slug as that might lead to open redirect vulnerabilities
  redirect(slug);
}
