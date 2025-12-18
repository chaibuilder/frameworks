CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text,
	"status" text DEFAULT 'active',
	"billingStartDate" date,
	"startDate" date,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"loginHtml" text,
	"features" jsonb DEFAULT '{}'::jsonb,
	"paymentConfig" jsonb DEFAULT '{}'::jsonb,
	"theme" text,
	"helpHtml" text,
	"madeWithBadge" text
);
--> statement-breakpoint
CREATE TABLE "apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"name" varchar,
	"user" uuid,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"theme" jsonb DEFAULT '{}'::jsonb,
	"fallbackLang" text DEFAULT 'en',
	"languages" jsonb DEFAULT '[]'::jsonb,
	"changes" jsonb,
	"configData" jsonb,
	"deletedAt" timestamp with time zone,
	"client" uuid
);
--> statement-breakpoint
CREATE TABLE "apps_online" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"name" varchar,
	"user" uuid,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"theme" jsonb DEFAULT '{}'::jsonb,
	"fallbackLang" text DEFAULT 'en',
	"languages" jsonb DEFAULT '[]'::jsonb,
	"changes" jsonb,
	"configData" jsonb,
	"apiKey" text,
	"deletedAt" timestamp with time zone,
	"client" uuid
);
--> statement-breakpoint
CREATE TABLE "app_online_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"slug" text NOT NULL,
	"lang" text DEFAULT '' NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb,
	"app" uuid NOT NULL,
	"buildTime" boolean DEFAULT false,
	"status" text DEFAULT 'UNPUBLISHED',
	"name" text NOT NULL,
	"global" boolean DEFAULT false,
	"primaryPage" uuid,
	"type" text DEFAULT '',
	"blocks" jsonb DEFAULT '[]'::jsonb,
	"globalBlocks" text DEFAULT '',
	"currentEditor" uuid,
	"links" text DEFAULT '',
	"online" boolean DEFAULT false,
	"page" uuid,
	"collection" text DEFAULT 'page',
	"parent" uuid,
	"pageType" text
);
--> statement-breakpoint
CREATE TABLE "app_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"slug" text NOT NULL,
	"lang" text DEFAULT '' NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb,
	"app" uuid NOT NULL,
	"buildTime" boolean DEFAULT false,
	"name" text NOT NULL,
	"primaryPage" uuid,
	"blocks" jsonb DEFAULT '[]'::jsonb,
	"currentEditor" text,
	"changes" jsonb,
	"collection" text DEFAULT 'page',
	"online" boolean DEFAULT false,
	"parent" uuid,
	"pageType" text,
	"lastSaved" timestamp with time zone,
	"dynamic" boolean DEFAULT false,
	"libRefId" uuid,
	"dynamicSlugCustom" varchar DEFAULT '',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"tracking" jsonb DEFAULT '{}'::jsonb,
	"jsonld" jsonb DEFAULT '{}'::jsonb,
	"globalJsonLds" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "app_pages_online" (
	"id" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"slug" text NOT NULL,
	"lang" text DEFAULT '' NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb,
	"app" uuid NOT NULL,
	"buildTime" boolean DEFAULT false,
	"name" text NOT NULL,
	"primaryPage" uuid,
	"blocks" jsonb DEFAULT '[]'::jsonb,
	"currentEditor" text,
	"changes" jsonb,
	"collection" text DEFAULT 'page',
	"partialBlocks" text,
	"links" text,
	"online" boolean DEFAULT true,
	"pageType" text,
	"parent" uuid,
	"lastSaved" timestamp with time zone,
	"dynamic" boolean DEFAULT false,
	"libRefId" uuid,
	"dynamicSlugCustom" varchar DEFAULT '',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"tracking" jsonb DEFAULT '{}'::jsonb,
	"jsonld" jsonb DEFAULT '{}'::jsonb,
	"globalJsonLds" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "app_pages_revisions" (
	"uid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"id" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"slug" text NOT NULL,
	"lang" text DEFAULT '' NOT NULL,
	"seo" jsonb DEFAULT '{}'::jsonb,
	"app" uuid NOT NULL,
	"buildTime" boolean DEFAULT false,
	"name" text NOT NULL,
	"primaryPage" uuid,
	"blocks" jsonb DEFAULT '[]'::jsonb,
	"currentEditor" text,
	"changes" jsonb,
	"collection" text DEFAULT 'page',
	"partialBlocks" text,
	"links" text,
	"online" boolean DEFAULT true,
	"pageType" text,
	"parent" uuid,
	"lastSaved" timestamp with time zone,
	"dynamic" boolean DEFAULT false,
	"type" varchar DEFAULT 'published',
	"libRefId" uuid,
	"dynamicSlugCustom" varchar DEFAULT '',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"tracking" jsonb DEFAULT '{}'::jsonb,
	"jsonld" jsonb DEFAULT '{}'::jsonb,
	"globalJsonLds" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "app_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"app" uuid,
	"name" text,
	"description" text,
	"url" text,
	"size" text,
	"folderId" text,
	"thumbnailUrl" text,
	"duration" numeric,
	"format" text,
	"width" numeric,
	"height" numeric,
	"createdBy" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"type" text,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"app" uuid,
	"hosting" text DEFAULT 'vercel',
	"hostingProjectId" text DEFAULT 'env',
	"subdomain" text,
	"domain" text,
	"domainConfigured" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "app_form_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"app" uuid,
	"formData" json,
	"additionalData" json,
	"formName" text DEFAULT '',
	"pageUrl" text
);
--> statement-breakpoint
CREATE TABLE "libraries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"name" varchar,
	"app" uuid,
	"type" varchar,
	"status" text DEFAULT 'active' NOT NULL,
	"client" uuid
);
--> statement-breakpoint
CREATE TABLE "library_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"library" uuid,
	"name" text,
	"description" text,
	"blocks" jsonb DEFAULT '[]'::jsonb,
	"preview" text,
	"group" text DEFAULT 'general',
	"user" text,
	"html" text
);
--> statement-breakpoint
CREATE TABLE "library_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"user" text,
	"name" text,
	"description" text,
	"pageId" uuid,
	"pageType" text,
	"library" uuid,
	"preview" text
);
--> statement-breakpoint
CREATE TABLE "app_user_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"user" uuid,
	"planId" text DEFAULT 'FREE',
	"nextBilledAt" timestamp NOT NULL,
	"status" text DEFAULT 'ACTIVE',
	"data" jsonb,
	"priceId" text,
	"subscriptionId" text,
	"client" uuid
);
--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"user" uuid,
	"app" uuid,
	"role" varchar DEFAULT 'editor',
	"permissions" jsonb,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "do_not_delete" (
	"user" uuid PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"password" boolean DEFAULT false NOT NULL,
	"email" text NOT NULL,
	"name" text,
	CONSTRAINT "do_not_delete_user_unique" UNIQUE("user")
);
--> statement-breakpoint
CREATE TABLE "app_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"apiKey" text DEFAULT '',
	"app" uuid,
	"status" text DEFAULT 'ACTIVE'
);
--> statement-breakpoint
CREATE TABLE "app_pages_metadata" (
	"id" bigint GENERATED ALWAYS AS IDENTITY (sequence name "app_pages_metadata_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"slug" varchar NOT NULL,
	"pageId" uuid DEFAULT gen_random_uuid(),
	"publishedAt" timestamp with time zone,
	"pageType" varchar,
	"pageBlocks" varchar,
	"dataBindings" varchar,
	"pageContent" varchar,
	"dataProviders" varchar,
	"app" uuid DEFAULT gen_random_uuid() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chai_studio_installs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chai_studio_installs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"installUuid" uuid,
	"installDatetime" timestamp with time zone,
	"lastOpened" timestamp with time zone,
	"installVersion" varchar,
	"latestVersion" varchar,
	"status" varchar DEFAULT 'ACTIVE',
	"os" varchar,
	"stats" jsonb,
	"licenseKey" text,
	"purchaseEmail" text,
	"country" text,
	"licenseType" text
);
--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_client_clients_id_fk" FOREIGN KEY ("client") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apps_online" ADD CONSTRAINT "apps_online_client_clients_id_fk" FOREIGN KEY ("client") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_online_pages" ADD CONSTRAINT "app_online_pages_app_apps_id_fk" FOREIGN KEY ("app") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_pages" ADD CONSTRAINT "app_pages_app_apps_id_fk" FOREIGN KEY ("app") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_pages_online" ADD CONSTRAINT "app_pages_online_app_apps_id_fk" FOREIGN KEY ("app") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_pages_revisions" ADD CONSTRAINT "app_pages_revisions_app_apps_id_fk" FOREIGN KEY ("app") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_assets" ADD CONSTRAINT "app_assets_app_apps_id_fk" FOREIGN KEY ("app") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_domains" ADD CONSTRAINT "app_domains_app_apps_id_fk" FOREIGN KEY ("app") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_form_submissions" ADD CONSTRAINT "app_form_submissions_app_apps_id_fk" FOREIGN KEY ("app") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libraries" ADD CONSTRAINT "libraries_app_apps_id_fk" FOREIGN KEY ("app") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libraries" ADD CONSTRAINT "libraries_client_clients_id_fk" FOREIGN KEY ("client") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_items" ADD CONSTRAINT "library_items_library_libraries_id_fk" FOREIGN KEY ("library") REFERENCES "public"."libraries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_templates" ADD CONSTRAINT "library_templates_library_libraries_id_fk" FOREIGN KEY ("library") REFERENCES "public"."libraries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_user_plans" ADD CONSTRAINT "app_user_plans_client_clients_id_fk" FOREIGN KEY ("client") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_app_apps_id_fk" FOREIGN KEY ("app") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_api_keys" ADD CONSTRAINT "app_api_keys_app_apps_id_fk" FOREIGN KEY ("app") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;