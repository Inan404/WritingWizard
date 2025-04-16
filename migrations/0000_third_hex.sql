CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "writing_chats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"raw_text" text NOT NULL,
	"grammar_result" text,
	"paraphrase_result" text,
	"ai_check_result" text,
	"humanize_result" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "writing_chats" ADD CONSTRAINT "writing_chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;