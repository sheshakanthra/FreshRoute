import { pgTable, uuid, text, timestamp, integer } from "drizzle-orm/pg-core";
import { ingestionRunStatusEnum } from "./enums";

/**
 * System/ops table tracking external data pulls — not org-scoped, since an
 * ingestion run fetches shared reference data (market prices) on behalf of
 * the whole system, not one tenant. Written by D2's pipeline; D0's one-shot
 * pull predates this table and is tracked instead by the manifest files
 * under data/validation/raw/.
 */
export const ingestionRun = pgTable("ingestion_run", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: ingestionRunStatusEnum("status").notNull().default("RUNNING"),
  rowsFetched: integer("rows_fetched").notNull().default(0),
  rowsInserted: integer("rows_inserted").notNull().default(0),
  rowsRejected: integer("rows_rejected").notNull().default(0),
  errorSummary: text("error_summary"),
});
