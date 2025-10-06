CREATE TYPE "public"."asset_type" AS ENUM('GALLERY', 'IMAGE', 'SOUND', 'VIDEO');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('PENDING', 'RUNNING', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."participant_role" AS ENUM('OWNER', 'COORDINATOR', 'PARTICIPANT', 'VIEW_ONLY');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "timer" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_event_id" text NOT NULL,
	"name" text NOT NULL,
	"scheduled_start_time" timestamp,
	"duration_minutes" integer DEFAULT 0,
	"status" "status" DEFAULT 'PENDING' NOT NULL,
	"is_manual" boolean DEFAULT false NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_by_id" text NOT NULL,
	"last_modified_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "timer_action" (
	"id" text PRIMARY KEY NOT NULL,
	"timer_id" text NOT NULL,
	"type" "asset_type" NOT NULL,
	"status" "status" DEFAULT 'PENDING' NOT NULL,
	"trigger_offset_minutes" integer DEFAULT 0 NOT NULL,
	"title" text,
	"url" text,
	"urls" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"content_fr" text,
	"content_en" text,
	"content_br" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"display_duration_sec" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"executed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "wedding_event" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"event_date" timestamp NOT NULL,
	"location" text,
	"is_demo" boolean DEFAULT false,
	"current_timer_id" text,
	"owner_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "wedding_participant" (
	"id" text PRIMARY KEY NOT NULL,
	"wedding_event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "participant_role" NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timer" ADD CONSTRAINT "timer_wedding_event_id_wedding_event_id_fk" FOREIGN KEY ("wedding_event_id") REFERENCES "public"."wedding_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timer" ADD CONSTRAINT "timer_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timer" ADD CONSTRAINT "timer_last_modified_by_id_user_id_fk" FOREIGN KEY ("last_modified_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timer_action" ADD CONSTRAINT "timer_action_timer_id_timer_id_fk" FOREIGN KEY ("timer_id") REFERENCES "public"."timer"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wedding_event" ADD CONSTRAINT "wedding_event_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wedding_participant" ADD CONSTRAINT "wedding_participant_wedding_event_id_wedding_event_id_fk" FOREIGN KEY ("wedding_event_id") REFERENCES "public"."wedding_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wedding_participant" ADD CONSTRAINT "wedding_participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;