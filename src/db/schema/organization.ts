import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { organizationTypeEnum } from "./enums";

/** The multi-tenancy root. Every org-owned domain table carries org_id from
 * this first migration — schema-notes.md explains why this isn't optional. */
export const organization = pgTable("organization", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: organizationTypeEnum("type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
