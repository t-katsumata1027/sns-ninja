ALTER TABLE "accounts" ADD COLUMN "account_type" text DEFAULT 'affiliate' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "enable_auto_post" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "enable_image_generation" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "concepts" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "engagement_logs_account_id_acted_at_idx" ON "engagement_logs" USING btree ("account_id","acted_at");