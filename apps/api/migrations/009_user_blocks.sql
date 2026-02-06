CREATE TABLE IF NOT EXISTS "public"."user_blocks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "blocker_user_id" uuid NOT NULL,
  "blocked_user_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_blocks_blocker_fkey" FOREIGN KEY ("blocker_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
  CONSTRAINT "user_blocks_blocked_fkey" FOREIGN KEY ("blocked_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
  CONSTRAINT "user_blocks_unique" UNIQUE ("blocker_user_id", "blocked_user_id"),
  CONSTRAINT "user_blocks_different_users" CHECK ("blocker_user_id" <> "blocked_user_id")
);

ALTER TABLE "public"."user_blocks" OWNER TO "postgres";

COMMENT ON TABLE "public"."user_blocks" IS 'Stores user blocking relationships. Blocking prevents matchmaking, favorites interactions, and incoming calls.';

CREATE INDEX IF NOT EXISTS "user_blocks_blocker_idx" ON "public"."user_blocks" ("blocker_user_id");
CREATE INDEX IF NOT EXISTS "user_blocks_blocked_idx" ON "public"."user_blocks" ("blocked_user_id");

GRANT ALL ON TABLE "public"."user_blocks" TO "anon";
GRANT ALL ON TABLE "public"."user_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_blocks" TO "service_role";
