import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";

const checkForEnv = (envVar: string | undefined, name: string) => {
  if (!envVar) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return envVar;
};

checkForEnv(process.env.DATABASE_URL, "DATABASE_URL");

const connectionString = process.env.DATABASE_URL || "";
const client = postgres(connectionString, { max: 10 });
export const db = drizzle(client, { schema });

export { schema };
