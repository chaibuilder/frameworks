import { pgTable, uuid, timestamp, varchar, jsonb, text, boolean } from "drizzle-orm/pg-core";
import { apps } from "./apps";
import { clients } from "./clients";

export const appUsers = pgTable("app_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  user: uuid("user"),
  app: uuid("app").references(() => apps.id),
  role: varchar("role").default("editor"),
  permissions: jsonb("permissions"),
  status: text("status").notNull().default("active"),
});

export const appUserPlans = pgTable("app_user_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  user: uuid("user"),
  planId: text("planId").default("FREE"),
  nextBilledAt: timestamp("nextBilledAt").notNull(),
  status: text("status").default("ACTIVE"),
  data: jsonb("data"),
  priceId: text("priceId"),
  subscriptionId: text("subscriptionId"),
  client: uuid("client").references(() => clients.id),
});

export const doNotDelete = pgTable("do_not_delete", {
  user: uuid("user").primaryKey().notNull().unique(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  password: boolean("password").notNull().default(false),
  email: text("email").notNull(),
  name: text("name"),
});
