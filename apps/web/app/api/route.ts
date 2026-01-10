// const apiKey = process.env.CHAIBUILDER_API_KEY!;
// const handler: any = builderApiHandler(apiKey);

// export { handler as POST };
ChaiActionsRegistry.register("LOGIN", new LoginAction());

export const POST = () => {
  return new Response("Not implemented");
};
