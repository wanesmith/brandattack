CREATE TABLE "carts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"email" text,
	"items" text DEFAULT '[]' NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"subtotal_usd" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_carts_updated" ON "carts" USING btree ("updated_at");