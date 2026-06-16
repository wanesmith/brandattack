CREATE TYPE "public"."division" AS ENUM('APPAREL', 'FOOTWEAR', 'HARDWARE');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('MEN', 'WOMEN', 'UNISEX', 'KIDS');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'shipped', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"product_title" text NOT NULL,
	"size_label" text NOT NULL,
	"qty" integer NOT NULL,
	"unit_price_usd" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"stripe_session_id" text NOT NULL,
	"stripe_payment_intent_id" text,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"subtotal_usd" numeric(10, 2) NOT NULL,
	"shipping_usd" numeric(10, 2) DEFAULT '0' NOT NULL,
	"tax_usd" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_usd" numeric(10, 2) NOT NULL,
	"shipping_address" text,
	"tracking_number" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_stripe_session_id_unique" UNIQUE("stripe_session_id")
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"product_id" text NOT NULL,
	"position" integer NOT NULL,
	"url" text NOT NULL,
	CONSTRAINT "product_images_product_id_position_pk" PRIMARY KEY("product_id","position")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"article_no" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"brand" text DEFAULT 'Adidas' NOT NULL,
	"division" "division" NOT NULL,
	"gender" "gender" NOT NULL,
	"sports_code" text DEFAULT '' NOT NULL,
	"product_group" text DEFAULT '' NOT NULL,
	"product_type" text DEFAULT '' NOT NULL,
	"season" text DEFAULT '' NOT NULL,
	"rrp_usd" numeric(10, 2) NOT NULL,
	"price_usd" numeric(10, 2) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_article_no_unique" UNIQUE("article_no")
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" text NOT NULL,
	"qty" integer NOT NULL,
	"stripe_session_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservations_stripe_session_id_unique" UNIQUE("stripe_session_id")
);
--> statement-breakpoint
CREATE TABLE "variants" (
	"sku" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"size" text NOT NULL,
	"size_label" text NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_sku_variants_sku_fk" FOREIGN KEY ("sku") REFERENCES "public"."variants"("sku") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variants" ADD CONSTRAINT "variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_order_items_order" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_orders_email" ON "orders" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_products_division" ON "products" USING btree ("division");--> statement-breakpoint
CREATE INDEX "idx_products_gender" ON "products" USING btree ("gender");--> statement-breakpoint
CREATE INDEX "idx_products_active" ON "products" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_reservations_session" ON "reservations" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE INDEX "idx_reservations_expires" ON "reservations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_variants_product" ON "variants" USING btree ("product_id");