CREATE TABLE IF NOT EXISTS "public"."notifications" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "type" text NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "is_read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_user_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."notifications" OWNER TO "postgres";

COMMENT ON TABLE "public"."notifications" IS 'Stores persistent in-app notifications for users. Delivered via socket when online.';

CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "public"."notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "notifications_is_read_idx" ON "public"."notifications" ("is_read");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "public"."notifications" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "notifications_user_unread_idx" ON "public"."notifications" ("user_id", "is_read") WHERE "is_read" = false;

GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";

CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "endpoint" text NOT NULL,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "push_subscriptions_user_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
  CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE ("endpoint")
);

ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";

COMMENT ON TABLE "public"."push_subscriptions" IS 'Stores Web Push API subscriptions for push notifications.';

CREATE INDEX IF NOT EXISTS "push_subscriptions_user_id_idx" ON "public"."push_subscriptions" ("user_id");

GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";
