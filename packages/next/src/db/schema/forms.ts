import { pgTable, uuid, timestamp, json, text } from "drizzle-orm/pg-core";
import { apps } from "./apps";

export const appFormSubmissions = pgTable("app_form_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  app: uuid("app").references(() => apps.id),
  formData: json("formData"),
  additionalData: json("additionalData"),
  formName: text("formName").default(""),
  pageUrl: text("pageUrl"),
});
