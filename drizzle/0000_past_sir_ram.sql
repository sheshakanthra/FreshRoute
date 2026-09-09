CREATE TYPE "public"."batch_status" AS ENUM('ACTIVE', 'IN_TRANSIT', 'CLOSED', 'DISCARDED');--> statement-breakpoint
CREATE TYPE "public"."demand_source" AS ENUM('ARRIVALS_OBSERVED', 'ABSENT');--> statement-breakpoint
CREATE TYPE "public"."evidence_tier" AS ENUM('VERIFIED', 'PLAUSIBLE_UNVERIFIED');--> statement-breakpoint
CREATE TYPE "public"."ingestion_run_status" AS ENUM('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."lane_mode" AS ENUM('ROAD', 'RAIL', 'MULTIMODAL');--> statement-breakpoint
CREATE TYPE "public"."market_type" AS ENUM('APMC', 'UZHAVAR_SANDHAI', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."organization_type" AS ENUM('FPO', 'COLLECTION_CENTRE', 'AGGREGATOR');--> statement-breakpoint
CREATE TYPE "public"."outcome_data_source" AS ENUM('OPERATOR_REPORTED', 'SYSTEM_INFERRED');--> statement-breakpoint
CREATE TYPE "public"."recommendation_status" AS ENUM('ISSUED', 'ACCEPTED', 'REJECTED', 'OVERRIDDEN', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."telemetry_data_source" AS ENUM('OBSERVED', 'SIMULATED', 'USER_REPORTED');--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "organization_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commodity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"climacteric" boolean NOT NULL,
	"quality_floor_fresh" numeric(4, 3),
	"quality_floor_process" numeric(4, 3),
	"optimal_temp_c" numeric(5, 2),
	"chilling_threshold_c" numeric(5, 2),
	"optimal_humidity_min" numeric(5, 2),
	"optimal_humidity_max" numeric(5, 2),
	"q10" numeric(5, 2),
	"base_decay_points_per_hour" numeric(6, 3),
	"notes" text,
	CONSTRAINT "commodity_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "market" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"district" text,
	"state" text DEFAULT 'Tamil Nadu' NOT NULL,
	"lat" numeric(9, 6),
	"lon" numeric(9, 6),
	"external_code" text,
	"market_type" "market_type" NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_alias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"raw_name" text NOT NULL,
	"market_canonical_id" uuid NOT NULL,
	"mapping_note" text DEFAULT '' NOT NULL,
	"is_duplicate_listing" boolean DEFAULT false NOT NULL,
	"source" text DEFAULT 'data.gov.in' NOT NULL,
	"seeded_from" text DEFAULT 'data/validation/lookup/markets_tn.csv' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "market_alias_raw_name_unique" UNIQUE("raw_name")
);
--> statement-breakpoint
CREATE TABLE "market_price" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"commodity_id" uuid NOT NULL,
	"variety" text NOT NULL,
	"grade" text,
	"price_date" date NOT NULL,
	"min_price_inr_per_kg" numeric(8, 4),
	"max_price_inr_per_kg" numeric(8, 4),
	"modal_price_inr_per_kg" numeric(8, 4),
	"raw_price_value" numeric(12, 4),
	"raw_price_unit" text DEFAULT 'INR/quintal' NOT NULL,
	"arrival_qty_kg" numeric(12, 2),
	"raw_arrival_value" numeric(12, 4),
	"raw_arrival_unit" text,
	"demand_source" "demand_source" DEFAULT 'ABSENT' NOT NULL,
	"is_duplicate_listing" boolean DEFAULT false NOT NULL,
	"duplicate_source_count" integer DEFAULT 1 NOT NULL,
	"source" text NOT NULL,
	"source_url" text,
	"fetched_at" timestamp with time zone NOT NULL,
	"license" text NOT NULL,
	"raw_row_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "batch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"commodity_id" uuid NOT NULL,
	"external_ref" text,
	"quantity_kg" numeric(10, 2) NOT NULL,
	"variety" text,
	"ripeness_stage" text,
	"precooled" boolean DEFAULT false NOT NULL,
	"packaging_type" text,
	"origin" text,
	"current_location" text,
	"harvest_timestamp" timestamp with time zone,
	"cost_basis_inr" numeric(12, 2),
	"status" "batch_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "batch_telemetry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"temperature_c" numeric(5, 2),
	"humidity_pct" numeric(5, 2),
	"sensor_id" text,
	"data_source" "telemetry_data_source" NOT NULL,
	"dedupe_key" text NOT NULL,
	CONSTRAINT "batch_telemetry_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "condition_assessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"quality_score" numeric(5, 2) NOT NULL,
	"decay_points_per_hour" numeric(6, 3),
	"remaining_useful_life_hours" numeric(8, 2),
	"model_name" text NOT NULL,
	"model_version" text NOT NULL,
	"input_snapshot" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lane" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"origin_ref" text NOT NULL,
	"destination_market_id" uuid NOT NULL,
	"distance_km" numeric(8, 2) NOT NULL,
	"typical_transit_hours" numeric(6, 2) NOT NULL,
	"road_quality_index" numeric(4, 2),
	"mode" "lane_mode" DEFAULT 'ROAD' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processing_facility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"lat" numeric(9, 6),
	"lon" numeric(9, 6),
	"gate_price_per_kg" numeric(8, 4),
	"yield_ratio" numeric(5, 4),
	"min_quality_score" numeric(5, 2),
	"daily_capacity_kg" numeric(12, 2),
	"product_form" text
);
--> statement-breakpoint
CREATE TABLE "storage_facility" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"lat" numeric(9, 6),
	"lon" numeric(9, 6),
	"storage_temp_c" numeric(5, 2),
	"storage_humidity_pct" numeric(5, 2),
	"cost_per_kg_per_day" numeric(8, 4),
	"capacity_kg" numeric(12, 2),
	"max_storage_days" integer
);
--> statement-breakpoint
CREATE TABLE "action_type" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"evidence_tier" "evidence_tier" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "action_execution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recommendation_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"executed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"executed_action_code" text NOT NULL,
	"executed_by" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "outcome_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"recommendation_id" uuid,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"realized_value_inr" numeric(12, 2),
	"realized_loss_kg" numeric(10, 2),
	"actual_destination" text,
	"notes" text,
	"data_source" "outcome_data_source" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"chosen_action_code" text NOT NULL,
	"destination_ref" text,
	"expected_recoverable_value_inr" numeric(12, 2) NOT NULL,
	"baseline_value_inr" numeric(12, 2) NOT NULL,
	"modelled_uplift_inr" numeric(12, 2) NOT NULL,
	"spoilage_probability" numeric(5, 4),
	"baseline_spoilage_probability" numeric(5, 4),
	"confidence" numeric(5, 4),
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cost_breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"engine_version" text NOT NULL,
	"model_versions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"feature_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"data_provenance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"contains_simulated_data" boolean DEFAULT false NOT NULL,
	"status" "recommendation_status" DEFAULT 'ISSUED' NOT NULL,
	"superseded_by_id" uuid
);
--> statement-breakpoint
CREATE TABLE "recommendation_candidate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recommendation_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"action_code" text NOT NULL,
	"destination_ref" text,
	"expected_value_inr" numeric(12, 2) NOT NULL,
	"spoilage_probability" numeric(5, 4),
	"quality_at_sale" numeric(5, 2),
	"exposure_hours" numeric(8, 2),
	"feasible" boolean NOT NULL,
	"infeasible_reason" text,
	"rank" integer NOT NULL,
	"costs" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" "ingestion_run_status" DEFAULT 'RUNNING' NOT NULL,
	"rows_fetched" integer DEFAULT 0 NOT NULL,
	"rows_inserted" integer DEFAULT 0 NOT NULL,
	"rows_rejected" integer DEFAULT 0 NOT NULL,
	"error_summary" text
);
--> statement-breakpoint
ALTER TABLE "market_alias" ADD CONSTRAINT "market_alias_market_canonical_id_market_id_fk" FOREIGN KEY ("market_canonical_id") REFERENCES "public"."market"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_price" ADD CONSTRAINT "market_price_market_id_market_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."market"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_price" ADD CONSTRAINT "market_price_commodity_id_commodity_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodity"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch" ADD CONSTRAINT "batch_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch" ADD CONSTRAINT "batch_commodity_id_commodity_id_fk" FOREIGN KEY ("commodity_id") REFERENCES "public"."commodity"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_telemetry" ADD CONSTRAINT "batch_telemetry_batch_id_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_telemetry" ADD CONSTRAINT "batch_telemetry_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condition_assessment" ADD CONSTRAINT "condition_assessment_batch_id_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "condition_assessment" ADD CONSTRAINT "condition_assessment_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lane" ADD CONSTRAINT "lane_destination_market_id_market_id_fk" FOREIGN KEY ("destination_market_id") REFERENCES "public"."market"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_execution" ADD CONSTRAINT "action_execution_recommendation_id_recommendation_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_execution" ADD CONSTRAINT "action_execution_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_execution" ADD CONSTRAINT "action_execution_executed_action_code_action_type_code_fk" FOREIGN KEY ("executed_action_code") REFERENCES "public"."action_type"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcome_record" ADD CONSTRAINT "outcome_record_batch_id_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batch"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcome_record" ADD CONSTRAINT "outcome_record_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcome_record" ADD CONSTRAINT "outcome_record_recommendation_id_recommendation_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation" ADD CONSTRAINT "recommendation_batch_id_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batch"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation" ADD CONSTRAINT "recommendation_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation" ADD CONSTRAINT "recommendation_chosen_action_code_action_type_code_fk" FOREIGN KEY ("chosen_action_code") REFERENCES "public"."action_type"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation" ADD CONSTRAINT "recommendation_superseded_by_id_recommendation_id_fk" FOREIGN KEY ("superseded_by_id") REFERENCES "public"."recommendation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_candidate" ADD CONSTRAINT "recommendation_candidate_recommendation_id_recommendation_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_candidate" ADD CONSTRAINT "recommendation_candidate_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_candidate" ADD CONSTRAINT "recommendation_candidate_action_code_action_type_code_fk" FOREIGN KEY ("action_code") REFERENCES "public"."action_type"("code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "market_name_district_uq" ON "market" USING btree ("name","district");--> statement-breakpoint
CREATE UNIQUE INDEX "market_price_unique_series_day" ON "market_price" USING btree ("market_id","commodity_id","variety","grade","price_date");--> statement-breakpoint
CREATE INDEX "batch_org_id_idx" ON "batch" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "batch_telemetry_batch_id_recorded_at_idx" ON "batch_telemetry" USING btree ("batch_id","recorded_at" DESC);--> statement-breakpoint
CREATE INDEX "condition_assessment_batch_id_computed_at_idx" ON "condition_assessment" USING btree ("batch_id","computed_at" DESC);--> statement-breakpoint
CREATE INDEX "action_execution_recommendation_id_idx" ON "action_execution" USING btree ("recommendation_id");--> statement-breakpoint
CREATE INDEX "outcome_record_batch_id_idx" ON "outcome_record" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "recommendation_batch_id_idx" ON "recommendation" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "recommendation_org_id_idx" ON "recommendation" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "recommendation_candidate_recommendation_id_idx" ON "recommendation_candidate" USING btree ("recommendation_id");