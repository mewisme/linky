-- Phase 2: Social & Retention Extensions
-- Streak freeze inventory, shared streaks, favorite EXP boost rules

ALTER TABLE "public"."user_streaks"
  ADD COLUMN IF NOT EXISTS "last_continuation_used_freeze" boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN "public"."user_streaks"."last_continuation_used_freeze" IS 'True when the most recent streak continuation used a freeze to bridge a one-day gap';

CREATE TABLE IF NOT EXISTS "public"."user_streak_freeze_inventory" (
  "user_id" "uuid" NOT NULL,
  "available_count" integer DEFAULT 0 NOT NULL,
  "total_used" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
  CONSTRAINT "user_streak_freeze_inventory_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "check_available_count" CHECK (("available_count" >= 0)),
  CONSTRAINT "check_total_used" CHECK (("total_used" >= 0)),
  CONSTRAINT "fk_user_streak_freeze_inventory_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE
);

COMMENT ON TABLE "public"."user_streak_freeze_inventory" IS 'Tracks available and used streak freezes per user';

CREATE TABLE IF NOT EXISTS "public"."user_streak_freeze_grants" (
  "user_id" "uuid" NOT NULL,
  "level_feature_unlock_id" "uuid" NOT NULL,
  "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
  CONSTRAINT "user_streak_freeze_grants_pkey" PRIMARY KEY ("user_id", "level_feature_unlock_id"),
  CONSTRAINT "fk_user_streak_freeze_grants_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_user_streak_freeze_grants_unlock" FOREIGN KEY ("level_feature_unlock_id") REFERENCES "public"."level_feature_unlocks"("id") ON DELETE CASCADE
);

COMMENT ON TABLE "public"."user_streak_freeze_grants" IS 'Tracks which level feature unlocks have granted streak freezes to avoid double-granting';

CREATE TABLE IF NOT EXISTS "public"."favorite_exp_boost_rules" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "one_way_multiplier" numeric(5,2) DEFAULT 1.00 NOT NULL,
  "mutual_multiplier" numeric(5,2) DEFAULT 1.00 NOT NULL,
  "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
  CONSTRAINT "favorite_exp_boost_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "check_one_way_multiplier" CHECK (("one_way_multiplier" >= 1.00)),
  CONSTRAINT "check_mutual_multiplier" CHECK (("mutual_multiplier" >= 1.00))
);

COMMENT ON TABLE "public"."favorite_exp_boost_rules" IS 'Admin-defined EXP multipliers when calling with favorite (one-way vs mutual)';

CREATE OR REPLACE FUNCTION "public"."update_favorite_exp_boost_rules_updated_at"() RETURNS "trigger"
  LANGUAGE "plpgsql"
  AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "trigger_update_favorite_exp_boost_rules_updated_at" ON "public"."favorite_exp_boost_rules";
CREATE TRIGGER "trigger_update_favorite_exp_boost_rules_updated_at"
  BEFORE UPDATE ON "public"."favorite_exp_boost_rules"
  FOR EACH ROW EXECUTE FUNCTION "public"."update_favorite_exp_boost_rules_updated_at"();

CREATE TABLE IF NOT EXISTS "public"."shared_streaks" (
  "user_a" "uuid" NOT NULL,
  "user_b" "uuid" NOT NULL,
  "current_streak" integer DEFAULT 0 NOT NULL,
  "longest_streak" integer DEFAULT 0 NOT NULL,
  "last_valid_date" "date",
  "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
  CONSTRAINT "shared_streaks_pkey" PRIMARY KEY ("user_a", "user_b"),
  CONSTRAINT "check_shared_user_order" CHECK (("user_a" < "user_b")),
  CONSTRAINT "check_shared_current_streak" CHECK (("current_streak" >= 0)),
  CONSTRAINT "check_shared_longest_streak" CHECK (("longest_streak" >= 0)),
  CONSTRAINT "fk_shared_streaks_user_a" FOREIGN KEY ("user_a") REFERENCES "public"."users"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_shared_streaks_user_b" FOREIGN KEY ("user_b") REFERENCES "public"."users"("id") ON DELETE CASCADE
);

COMMENT ON TABLE "public"."shared_streaks" IS 'Tracks shared streaks between two users who call each other on consecutive days';

CREATE INDEX IF NOT EXISTS "idx_user_streak_freeze_inventory_user_id" ON "public"."user_streak_freeze_inventory" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_streak_freeze_grants_user_id" ON "public"."user_streak_freeze_grants" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_shared_streaks_user_a" ON "public"."shared_streaks" ("user_a");
CREATE INDEX IF NOT EXISTS "idx_shared_streaks_user_b" ON "public"."shared_streaks" ("user_b");
CREATE INDEX IF NOT EXISTS "idx_shared_streaks_last_valid_date" ON "public"."shared_streaks" ("last_valid_date");

CREATE OR REPLACE FUNCTION "public"."prepare_streak_freeze"("p_user_id" "uuid", "p_gap_date" "date") RETURNS "void"
  LANGUAGE "plpgsql"
  AS $$
BEGIN
  UPDATE user_streaks
  SET last_valid_date = p_gap_date,
      last_continuation_used_freeze = true
  WHERE user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION "public"."prepare_streak_freeze"("p_user_id" "uuid", "p_gap_date" "date") IS 'Bridges a one-day gap for streak continuity by setting last_valid_date to the gap date; consumed freeze and last_continuation_used_freeze are handled by the application';

GRANT ALL ON TABLE "public"."user_streak_freeze_inventory" TO "anon";
GRANT ALL ON TABLE "public"."user_streak_freeze_inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."user_streak_freeze_inventory" TO "service_role";
GRANT ALL ON TABLE "public"."user_streak_freeze_grants" TO "anon";
GRANT ALL ON TABLE "public"."user_streak_freeze_grants" TO "authenticated";
GRANT ALL ON TABLE "public"."user_streak_freeze_grants" TO "service_role";
GRANT ALL ON TABLE "public"."favorite_exp_boost_rules" TO "anon";
GRANT ALL ON TABLE "public"."favorite_exp_boost_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."favorite_exp_boost_rules" TO "service_role";
GRANT ALL ON TABLE "public"."shared_streaks" TO "anon";
GRANT ALL ON TABLE "public"."shared_streaks" TO "authenticated";
GRANT ALL ON TABLE "public"."shared_streaks" TO "service_role";
GRANT ALL ON FUNCTION "public"."prepare_streak_freeze"("p_user_id" "uuid", "p_gap_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."prepare_streak_freeze"("p_user_id" "uuid", "p_gap_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."prepare_streak_freeze"("p_user_id" "uuid", "p_gap_date" "date") TO "service_role";
