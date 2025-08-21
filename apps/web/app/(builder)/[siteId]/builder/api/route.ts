import { builderApiHandler } from "chai-next/server";

if (!process.env.CHAIBUILDER_API_KEY) {
  throw new Error(
    `Cannot find CHAIBUILDER_API_KEY environment variable. 
     Please set it correctly.`,
  );
}

const handler: any = builderApiHandler();

export { handler as POST };
