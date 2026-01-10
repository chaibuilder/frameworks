import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../../../drizzle/schema";

/**
 * Action Context
 * Contains information and repositories needed by actions
 */
export interface ActionContext {
  appId: string;
  db: PostgresJsDatabase<typeof schema>;
  userId?: string;
  req?: unknown;
}

/**
 * ChaiAction Interface
 * Defines the contract for all action handlers
 */
export interface ChaiAction<T = any, K = any> {
  validate(data: T): boolean;
  setContext(context: ActionContext): void;
  execute(data: T): Promise<K>;
}
