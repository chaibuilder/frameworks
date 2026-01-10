import { builderApiHandler } from "@chaibuilder/nextjs/server";

const apiKey = process.env.CHAIBUILDER_API_KEY!;

// export { handler as POST };
// ChaiActionsRegistry.register("LOGIN", new LoginAction());

export const POST = (req: Request) => {
  const handler: any = builderApiHandler({ apiKey, userId: null });
  return handler(req);
};
