CREATE TABLE "evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"alert_id" text,
	"type" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" text,
	"mime_type" text,
	"local_uri" text,
	"cloud_uri" text,
	"thumbnail_uri" text,
	"latitude" text,
	"longitude" text,
	"address" text,
	"device_info" text,
	"is_shared" text DEFAULT 'false',
	"shared_with" text,
	"shared_at" timestamp,
	"description" text,
	"tags" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"latitude" text NOT NULL,
	"longitude" text NOT NULL,
	"accuracy" text,
	"altitude" text,
	"speed" text,
	"heading" text,
	"address" text,
	"is_emergency" text DEFAULT 'false',
	"alert_id" text,
	"is_shared" text DEFAULT 'false',
	"shared_with" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_data_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"alert_id" text,
	"recipient_contact_id" text,
	"recipient_phone" text NOT NULL,
	"recipient_name" text,
	"evidence_ids" text,
	"location_history_count" text,
	"share_link" text,
	"access_token" text,
	"status" text DEFAULT 'active',
	"expires_at" timestamp,
	"view_count" text DEFAULT '0',
	"last_viewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_alert_id_sos_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."sos_alerts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_history" ADD CONSTRAINT "location_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_history" ADD CONSTRAINT "location_history_alert_id_sos_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."sos_alerts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_data_sessions" ADD CONSTRAINT "shared_data_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_data_sessions" ADD CONSTRAINT "shared_data_sessions_alert_id_sos_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."sos_alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_data_sessions" ADD CONSTRAINT "shared_data_sessions_recipient_contact_id_emergency_contacts_id_fk" FOREIGN KEY ("recipient_contact_id") REFERENCES "public"."emergency_contacts"("id") ON DELETE cascade ON UPDATE no action;