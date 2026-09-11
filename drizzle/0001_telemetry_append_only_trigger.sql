-- Enforce "telemetry is append-only" (STAGE0 schema principle) at the
-- database level, not just by application convention — this table is
-- explicitly called out as not-optional. UPDATE and DELETE are rejected
-- outright; only INSERT is permitted.
CREATE OR REPLACE FUNCTION batch_telemetry_forbid_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'batch_telemetry is append-only: % is not permitted (row id=%)',
    TG_OP, COALESCE(OLD.id, NULL);
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER batch_telemetry_no_update
  BEFORE UPDATE ON "batch_telemetry"
  FOR EACH ROW EXECUTE FUNCTION batch_telemetry_forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER batch_telemetry_no_delete
  BEFORE DELETE ON "batch_telemetry"
  FOR EACH ROW EXECUTE FUNCTION batch_telemetry_forbid_mutation();
