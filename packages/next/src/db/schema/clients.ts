import { pgTable, uuid, timestamp, text, date, jsonb, boolean } from "drizzle-orm/pg-core";

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  name: text("name"),
  status: text("status").default("active"),
  billingStartDate: date("billingStartDate"),
  startDate: date("startDate"),
  settings: jsonb("settings").default({}),
  loginHtml: text("loginHtml"),
  features: jsonb("features").default({}),
  paymentConfig: jsonb("paymentConfig").default({}),
  theme: text("theme"),
  helpHtml: text("helpHtml"),
  madeWithBadge: text("madeWithBadge"),
});
