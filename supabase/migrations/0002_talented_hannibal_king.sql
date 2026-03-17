ALTER TABLE "concepts" ADD COLUMN "product_url" text;--> statement-breakpoint
ALTER TABLE "concepts" ADD COLUMN "use_hashtags" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "concepts" ADD COLUMN "suggested_hashtags" jsonb;--> statement-breakpoint
ALTER TABLE "concepts" ADD COLUMN "footer_text" text;--> statement-breakpoint
ALTER TABLE "concepts" ADD COLUMN "personality" text;