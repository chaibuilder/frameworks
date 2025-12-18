import { pgTable, bigint, timestamp, varchar, uuid } from "drizzle-orm/pg-core";

export const appPagesMetadata = pgTable("app_pages_metadata", {
  id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  slug: varchar("slug").notNull(),
  pageId: uuid("pageId").defaultRandom(),
  publishedAt: timestamp("publishedAt", { withTimezone: true }),
  pageType: varchar("pageType"),
  pageBlocks: varchar("pageBlocks"),
  dataBindings: varchar("dataBindings"),
  pageContent: varchar("pageContent"),
  dataProviders: varchar("dataProviders"),
  app: uuid("app").notNull().defaultRandom(),
});
