import { pgTable, uuid, timestamp, varchar, jsonb, text } from "drizzle-orm/pg-core";
import { clients } from "./clients";

export const apps = pgTable("apps", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  name: varchar("name"),
  user: uuid("user"),
  settings: jsonb("settings").default({}),
  theme: jsonb("theme").default({}),
  fallbackLang: text("fallbackLang").default("en"),
  languages: jsonb("languages").default([]),
  changes: jsonb("changes"),
  configData: jsonb("configData"),
  deletedAt: timestamp("deletedAt", { withTimezone: true }),
  client: uuid("client").references(() => clients.id),
});

export const appsOnline = pgTable("apps_online", {
  id: uuid("id").primaryKey(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  name: varchar("name"),
  user: uuid("user"),
  settings: jsonb("settings").default({}),
  theme: jsonb("theme").default({}),
  fallbackLang: text("fallbackLang").default("en"),
  languages: jsonb("languages").default([]),
  changes: jsonb("changes"),
  configData: jsonb("configData"),
  apiKey: text("apiKey"),
  deletedAt: timestamp("deletedAt", { withTimezone: true }),
  client: uuid("client").references(() => clients.id),
});
