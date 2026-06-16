CREATE TABLE "facet_values" (
	"facet" text NOT NULL,
	"value" text NOT NULL,
	"label" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	CONSTRAINT "facet_values_facet_value_pk" PRIMARY KEY("facet","value")
);
--> statement-breakpoint
CREATE TABLE "facets" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "facet_values" ADD CONSTRAINT "facet_values_facet_facets_id_fk" FOREIGN KEY ("facet") REFERENCES "public"."facets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_facet_values_facet" ON "facet_values" USING btree ("facet");