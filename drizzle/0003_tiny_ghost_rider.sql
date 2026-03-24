ALTER TABLE "generations" ADD COLUMN "job_budget" integer;--> statement-breakpoint
ALTER TABLE "generations" ADD COLUMN "recommended_bid" integer;--> statement-breakpoint
ALTER TABLE "generations" ADD COLUMN "final_bid_submitted" integer;--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "base_hourly_rate" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ai_import_attempts" integer DEFAULT 0 NOT NULL;