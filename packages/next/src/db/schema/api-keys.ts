import { pgTable, uuid, timestamp, text } from "drizzle-orm/pg-core";
import { apps } from "./apps";

export const appApiKeys = pgTable("app_api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  apiKey: text("apiKey").default(""),
  app: uuid("app").references(() => apps.id),
  status: text("status").default("ACTIVE"),
});
