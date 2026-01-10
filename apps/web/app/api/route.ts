import { chaiBuilderActionHandler } from "@chaibuilder/nextjs/server";
import { get, has } from "lodash";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const apiKey = process.env.CHAIBUILDER_API_KEY!;

// export { handler as POST };
// ChaiActionsRegistry.register("LOGIN", new LoginAction());

export const POST = async (req: NextRequest) => {
  const actionData = (await req.json()) as { action: string; data?: unknown };
  const handler: any = chaiBuilderActionHandler<NextRequest>({ apiKey, userId: "test-user", req });
  const response = await handler(actionData);
  if (has(response, "error")) {
    return NextResponse.json(response, { status: response.status });
  }
  const tags = get(response, "tags", []);
  for (const tag of tags) {
    revalidateTag(tag, "max");
  }
  return NextResponse.json(response);
};
