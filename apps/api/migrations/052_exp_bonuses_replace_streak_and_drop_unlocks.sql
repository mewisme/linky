-- Replace streak_exp_bonuses with the more general exp_bonuses table
-- (type + config jsonb range), and remove level_feature_unlocks plus the
-- user_streak_freeze_grants table that referenced it.
--
-- streak_exp_bonuses rows are migrated as type='streak' with
-- config = { min: min_streak, max: max_streak }.

CREATE TABLE IF NOT EXISTS "public"."exp_bonuses" (
  "id" "uuid" PRIMARY KEY DEFAULT "gen_random_uuid"(),
  "bonus_multiplier" numeric(5, 2) NOT NULL DEFAULT 1.00,
  "type" text NOT NULL,
  "config" "jsonb" NOT NULL DEFAULT '{}'::"jsonb",
  "created_at" timestamp with time zone NOT NULL DEFAULT "now"(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT "now"(),
  CONSTRAINT "exp_bonuses_bonus_multiplier_check" CHECK ("bonus_multiplier" >= 1.00),
  CONSTRAINT "exp_bonuses_type_check" CHECK ("type" IN ('streak', 'level')),
  CONSTRAINT "exp_bonuses_config_range_check" CHECK (
    "config" ? 'min'
    AND "config" ? 'max'
    AND ("config" ->> 'min')::int >= 0
    AND ("config" ->> 'max')::int >= ("config" ->> 'min')::int
  )
);

ALTER TABLE "public"."exp_bonuses" OWNER TO "postgres";

COMMENT ON TABLE "public"."exp_bonuses" IS 'Admin-defined EXP bonus multipliers keyed by type (streak, level, ...) with a generic JSON config range';
COMMENT ON COLUMN "public"."exp_bonuses"."bonus_multiplier" IS 'Multiplier applied to EXP when the user matches this bonus (e.g., 1.50 for 50% bonus)';
COMMENT ON COLUMN "public"."exp_bonuses"."type" IS 'Bonus category, e.g. streak or level';
COMMENT ON COLUMN "public"."exp_bonuses"."config" IS 'Generic JSON config carrying the inclusive range, e.g. {"min": 0, "max": 7}';

CREATE INDEX IF NOT EXISTS "idx_exp_bonuses_type" ON "public"."exp_bonuses" USING "btree" ("type");

CREATE OR REPLACE TRIGGER "set_updated_at"
  BEFORE UPDATE ON "public"."exp_bonuses"
  FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

REVOKE ALL ON TABLE "public"."exp_bonuses" FROM "anon";
REVOKE ALL ON TABLE "public"."exp_bonuses" FROM "authenticated";
GRANT ALL ON TABLE "public"."exp_bonuses" TO "service_role";


-- Migrate existing streak_exp_bonuses rows (if any) into exp_bonuses.
INSERT INTO "public"."exp_bonuses" ("id", "bonus_multiplier", "type", "config", "created_at", "updated_at")
SELECT
  "id",
  "bonus_multiplier",
  'streak',
  jsonb_build_object('min', "min_streak", 'max', "max_streak"),
  "created_at",
  "updated_at"
FROM "public"."streak_exp_bonuses"
ON CONFLICT ("id") DO NOTHING;


-- Drop the streak_exp_bonuses table and its dedicated trigger function.
DROP TRIGGER IF EXISTS "trigger_update_streak_exp_bonuses_updated_at" ON "public"."streak_exp_bonuses";
DROP TRIGGER IF EXISTS "set_updated_at" ON "public"."streak_exp_bonuses";
DROP TABLE IF EXISTS "public"."streak_exp_bonuses";
DROP FUNCTION IF EXISTS "public"."update_streak_exp_bonuses_updated_at"();


-- user_streak_freeze_grants holds the FK reference to level_feature_unlocks,
-- so it must go first.
DROP TABLE IF EXISTS "public"."user_streak_freeze_grants";


-- Drop level_feature_unlocks together with its dedicated trigger function.
DROP TRIGGER IF EXISTS "trigger_update_level_feature_unlocks_updated_at" ON "public"."level_feature_unlocks";
DROP TRIGGER IF EXISTS "set_updated_at" ON "public"."level_feature_unlocks";
DROP TABLE IF EXISTS "public"."level_feature_unlocks";
DROP FUNCTION IF EXISTS "public"."update_level_feature_unlocks_updated_at"();
