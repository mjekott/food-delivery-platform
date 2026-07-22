ALTER TABLE "orders" ADD COLUMN "payment_provider" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_reference" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "expires_at" timestamp;