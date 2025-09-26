import { builderApiHandler } from "chai-next/server";

const apiKey = process.env.CHAIBUILDER_API_KEY!;
const handler: any = builderApiHandler(apiKey);

export { handler as POST };
