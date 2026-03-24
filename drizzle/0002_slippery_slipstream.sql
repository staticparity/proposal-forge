ALTER TABLE "generations" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "generations" ADD COLUMN "feedback_notes" text;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "ai_import_attempts";