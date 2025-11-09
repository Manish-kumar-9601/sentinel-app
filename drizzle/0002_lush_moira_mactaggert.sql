CREATE TABLE "sos_alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"message" text NOT NULL,
	"location" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"api_sent" text,
	"whatsapp_sent" text,
	"sms_sent" text,
	"call_made" text,
	"contacts_notified" text,
	"delivery_details" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "sos_alerts" ADD CONSTRAINT "sos_alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;