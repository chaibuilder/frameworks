import { pgTable, uuid, timestamp, varchar, text, jsonb } from "drizzle-orm/pg-core";
import { apps } from "./apps";
import { clients } from "./clients";

export const libraries = pgTable("libraries", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  name: varchar("name"),
  app: uuid("app").references(() => apps.id),
  type: varchar("type"),
  status: text("status").notNull().default("active"),
  client: uuid("client").references(() => clients.id),
});

export const libraryItems = pgTable("library_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  library: uuid("library").references(() => libraries.id),
  name: text("name"),
  description: text("description"),
  blocks: jsonb("blocks").default([]),
  preview: text("preview"),
  group: text("group").default("general"),
  user: text("user"),
  html: text("html"),
});

export const libraryTemplates = pgTable("library_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  user: text("user"),
  name: text("name"),
  description: text("description"),
  pageId: uuid("pageId"),
  pageType: text("pageType"),
  library: uuid("library").references(() => libraries.id),
  preview: text("preview"),
});
