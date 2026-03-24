ALTER TABLE "users" ALTER COLUMN "credits" SET DEFAULT 15;--> statement-breakpoint
ALTER TABLE "generations" ADD COLUMN "tone_used" varchar(50);--> statement-breakpoint
ALTER TABLE "generations" ADD COLUMN "follow_up_message" text;--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "portfolio_items" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tier" varchar(20) DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "api_key" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_api_key_unique" UNIQUE("api_key");