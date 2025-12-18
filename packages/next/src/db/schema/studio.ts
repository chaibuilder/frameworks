import { pgTable, bigint, timestamp, uuid, varchar, jsonb, text } from "drizzle-orm/pg-core";

export const chaiStudioInstalls = pgTable("chai_studio_installs", {
  id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey().notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  installUuid: uuid("installUuid"),
  installDatetime: timestamp("installDatetime", { withTimezone: true }),
  lastOpened: timestamp("lastOpened", { withTimezone: true }),
  installVersion: varchar("installVersion"),
  latestVersion: varchar("latestVersion"),
  status: varchar("status").default("ACTIVE"),
  os: varchar("os"),
  stats: jsonb("stats"),
  licenseKey: text("licenseKey"),
  purchaseEmail: text("purchaseEmail"),
  country: text("country"),
  licenseType: text("licenseType"),
});
