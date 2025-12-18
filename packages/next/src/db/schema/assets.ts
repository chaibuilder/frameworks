import { pgTable, uuid, timestamp, text, numeric } from "drizzle-orm/pg-core";
import { apps } from "./apps";

export const appAssets = pgTable("app_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  app: uuid("app").references(() => apps.id),
  name: text("name"),
  description: text("description"),
  url: text("url"),
  size: text("size"),
  folderId: text("folderId"),
  thumbnailUrl: text("thumbnailUrl"),
  duration: numeric("duration"),
  format: text("format"),
  width: numeric("width"),
  height: numeric("height"),
  createdBy: text("createdBy"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  type: text("type"),
  updatedAt: timestamp("updatedAt", { withTimezone: true }),
});
