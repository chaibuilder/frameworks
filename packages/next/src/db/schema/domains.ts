import { pgTable, uuid, timestamp, text, boolean } from "drizzle-orm/pg-core";
import { apps } from "./apps";

export const appDomains = pgTable("app_domains", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  app: uuid("app").references(() => apps.id),
  hosting: text("hosting").default("vercel"),
  hostingProjectId: text("hostingProjectId").default("env"),
  subdomain: text("subdomain"),
  domain: text("domain"),
  domainConfigured: boolean("domainConfigured").default(false),
});
