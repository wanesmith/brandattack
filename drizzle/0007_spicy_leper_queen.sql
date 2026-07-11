CREATE TABLE "translations" (
	"locale" text NOT NULL,
	"key" text NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translations_locale_key_pk" PRIMARY KEY("locale","key")
);
