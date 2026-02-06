CREATE TABLE IF NOT EXISTS "public"."broadcast_history" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "title" text,
  "message" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "broadcast_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "broadcast_history_created_by_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "broadcast_history_created_at_idx" ON "public"."broadcast_history" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "broadcast_history_created_by_idx" ON "public"."broadcast_history" ("created_by_user_id");
